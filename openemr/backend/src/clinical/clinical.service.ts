import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { normalizeKey } from '../common/dedup.util';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class ClinicalService implements OnModuleInit {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private readonly billing: BillingService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(
      `CREATE TABLE IF NOT EXISTS pharmacy_alerts (
         id INT AUTO_INCREMENT PRIMARY KEY,
         pid INT NOT NULL,
         drug VARCHAR(255) NOT NULL,
         message VARCHAR(255) NOT NULL,
         is_read TINYINT(1) NOT NULL DEFAULT 0,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8`,
    );
  }

  async getPharmacyAlerts(): Promise<any> {
    const alerts = await this.dataSource.query(
      `SELECT a.id, a.pid, a.drug, a.message, a.is_read, a.created_at,
              CONCAT(COALESCE(pd.fname,''), ' ', COALESCE(pd.lname,'')) AS patient_name
       FROM pharmacy_alerts a
       LEFT JOIN patient_data pd ON pd.pid = a.pid
       WHERE a.is_read = 0 ORDER BY a.created_at DESC LIMIT 50`,
    );
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS unread FROM pharmacy_alerts WHERE is_read = 0`,
    );
    return { alerts, unreadCount: Number(row?.unread) || 0 };
  }

  async markPharmacyAlertsRead(): Promise<any> {
    await this.dataSource.query(`UPDATE pharmacy_alerts SET is_read = 1 WHERE is_read = 0`);
    return { message: 'marked read' };
  }

  // Global prescriptions query (for pharmacy dashboard), enriched with billing status.
  async getAllPrescriptions() {
    const rows = await this.dataSource.query(
      `SELECT p.id, p.patient_id, pd.pid, CONCAT(pd.fname,' ',pd.lname) as patient_name,
        p.drug, p.dosage, p.quantity, p.refills, p.start_date, p.end_date, p.active, p.note
      FROM prescriptions p JOIN patient_data pd ON p.patient_id = pd.pid
      WHERE p.active = 1 ORDER BY p.start_date DESC LIMIT 100`,
    );

    const pids: number[] = Array.from(new Set((rows as any[]).map((r: any) => Number(r.patient_id) || 0))) as number[];
    const billingMap: Record<string, number> = {};
    if (pids.length) {
      const bRows = await this.dataSource.query(
        `SELECT pid, code, SUM(fee) AS fee FROM billing
         WHERE code_type = 'HCPCS' AND code LIKE 'RX-%' AND pid IN (${pids.map(() => '?').join(',')})
         GROUP BY pid, code`,
        pids,
      );
      for (const b of bRows) billingMap[`${b.pid}:${b.code}`] = Number(b.fee) || 0;
    }

    const balances = await this.billing.getPatientBalances(pids);
    const holdMap = await this.billing.getHoldMap(
      'pharmacy',
      (rows as any[]).map((r: any) => Number(r.id)).filter((n: number) => !!n),
    );

    return rows.map((r: any) => {
      const slug = String(r.drug || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
        .toUpperCase();
      const billed = billingMap[`${r.patient_id}:RX-${slug}`] || 0;
      const bal = balances[r.patient_id] || { charges: 0, paid: 0, balance: 0 };
      const paid = billed > 0 && bal.charges > 0 && bal.balance <= 0;
      const h = holdMap[Number(r.id)];
      return {
        ...r,
        billed: billed > 0,
        billed_amount_usd: billed,
        paid,
        billing_hold: h ? h.status : 'none',
        billing_held: !!(h && h.status === 'hold'),
        billing_cleared: !h || h.status === 'cleared' || h.status === 'cancelled',
        hold_fee_usd: h ? Number(h.fee) || 0 : 0,
        hold_code: h ? h.code || null : null,
        patient_charges_usd: bal.charges,
        patient_paid_usd: bal.paid,
        patient_balance_usd: bal.balance,
      };
    });
  }

  // ==================== Medications (Prescriptions) ====================

  async getMedications(pid: number) {
    return this.dataSource.query(
      `SELECT id, LOWER(HEX(uuid)) as uuid, patient_id, drug, dosage,
        quantity, route, refills, start_date, end_date, active, note,
        drug_id, \`interval\` AS dose_interval, date_added
      FROM prescriptions WHERE patient_id = ? ORDER BY start_date DESC LIMIT 100`,
      [pid],
    );
  }

  async createMedication(pid: number, dto: any) {
    const drug = normalizeKey(dto.drug || '');
    if (drug) {
      const existing = await this.dataSource.query(
        `SELECT id FROM prescriptions WHERE patient_id = ? AND active = 1 AND LOWER(drug) = ? LIMIT 1`,
        [pid, drug],
      );
      if (existing.length) {
        return { duplicate: true, existingId: existing[0].id, drug: dto.drug };
      }
    }
    const result = await this.dataSource.query(
      `INSERT INTO prescriptions (patient_id, drug, dosage, quantity, route,
        refills, start_date, end_date, note, drug_id, active, date_added, txDate,
        usage_category_title, request_intent_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), '', '')`,
      [pid, dto.drug || '', dto.dosage || '', dto.quantity || '',
       dto.route || '', dto.refills || 0, dto.start_date || null,
       dto.end_date || null, dto.note || '', dto.drug_id || 0],
    );
    // Notify the pharmacist when a provider prescribes (with the patient's name).
    const [pt] = await this.dataSource.query(
      `SELECT CONCAT(fname, ' ', lname) AS name FROM patient_data WHERE pid = ? LIMIT 1`,
      [pid],
    );
    const patientName = pt?.name || `Patient #${pid}`;
    await this.dataSource.query(
      `INSERT INTO pharmacy_alerts (pid, drug, message) VALUES (?, ?, ?)`,
      [pid, dto.drug || '', `New prescription: ${dto.drug || ''} (${dto.dosage || '—'}) — ${patientName}`],
    );
    const prescriptionId = result.insertId;
    // Auto-create the billing charge so it flows to billing + pharmacy billing status.
    const bill = await this.billing
      .billPrescription(pid, dto.drug || '', dto.provider_id || undefined)
      .catch(() => null);
    // Place a billing hold — the pharmacist cannot dispense until it is cleared.
    await this.billing.createHold({
      holdType: 'pharmacy', orderId: prescriptionId, pid,
      encounterId: null,
      code: bill?.code || null,
      description: dto.drug || '',
      fee: bill?.fee || 0,
    }).catch(() => null);
    return { id: prescriptionId, billingHold: true };
  }

  /** Provider batch-prescribes from screening: each med becomes a prescription + alert + billing. */
  async createMedicationsBatch(pid: number, medications: any[]) {
    const results: any[] = [];
    for (const m of medications || []) {
      if (!m || !m.drug) continue;
      const r = await this.createMedication(pid, {
        drug: m.drug,
        dosage: m.dosage || '',
        quantity: m.quantity || '',
        route: m.frequency || m.route || '',
        refills: m.refills || 0,
        note: m.duration ? `Duration: ${m.duration} days` : m.note || '',
        start_date: null,
        end_date: null,
      });
      results.push({ drug: m.drug, ...r });
    }
    return { count: results.length, results };
  }

  async updateMedication(id: number, dto: any) {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of ['drug', 'dosage', 'quantity', 'route', 'refills', 'start_date', 'end_date', 'note']) {
      if (dto[f] !== undefined) { sets.push(`${f} = ?`); vals.push(dto[f]); }
    }
    if (!sets.length) return;
    vals.push(id);
    await this.dataSource.query(`UPDATE prescriptions SET ${sets.join(', ')} WHERE id = ?`, vals);
  }

  async deleteMedication(id: number) {
    await this.dataSource.query(`UPDATE prescriptions SET active = 0 WHERE id = ?`, [id]);
  }

  // ==================== Allergies ====================

  async getAllergies(pid: number) {
    return this.dataSource.query(
      `SELECT id, title as allergen, comments as reaction, type, date, begdate, enddate
      FROM lists WHERE pid = ? AND type = 'allergy' ORDER BY date DESC LIMIT 100`,
      [pid],
    );
  }

  /**
   * Enriched allergy view: recorded allergies PLUS allergies extracted from
   * clinical/nurse notes and medication-derived conflict flags.
   */
  async getEnrichedAllergies(pid: number): Promise<any[]> {
    const recorded = await this.getAllergies(pid);
    const norm = (s: any) => String(s || '').toLowerCase().trim();

    const notes = await this.dataSource.query(
      `SELECT title, body FROM pnotes
       WHERE pid = ? AND deleted = 0 AND groupname IN ('clinical','progress','nurse')
       ORDER BY date DESC LIMIT 100`,
      [pid],
    );
    const meds = await this.dataSource.query(
      `SELECT drug, note FROM prescriptions WHERE patient_id = ? AND active = 1`,
      [pid],
    );

    const out: any[] = recorded.map((a: any) => ({
      allergen: a.allergen, reaction: a.reaction || '', source: 'recorded', id: a.id,
    }));
    const seen = new Set(out.map((a) => norm(a.allergen)));

    // ── Extract from notes: "allergic to X", "allergy: X", "allergies: X, Y" ──
    const noteText = (notes as any[])
      .map((n) => `${n.title || ''} ${n.body || ''}`)
      .join('\n');
    const re = /allerg(?:y|ies|ic)\s*(?:to|:)?\s*([^\n.;,]{2,40})/gi;
    let m: RegExpExecArray | null;
    const stop = /\b(and|or|but|with|the|a|an|to|of|is|are|was|were|no|none|not|nkda)\b/i;
    while ((m = re.exec(noteText)) !== null) {
      const raw = String(m[1] || '').trim();
      const term = raw.split(/[()\[\]]/)[0].trim();
      if (!term || stop.test(term) || term.length < 2) continue;
      if (!seen.has(norm(term))) {
        seen.add(norm(term));
        out.push({ allergen: term, reaction: 'Extracted from clinical notes', source: 'note' });
      }
    }

    // ── Medication-derived conflict flags: active meds matching a known allergen ──
    for (const med of meds as any[]) {
      const d = norm(med.drug);
      if (!d) continue;
      const hit = out.find((a) => a.allergen && (d.includes(norm(a.allergen)) || norm(a.allergen).includes(d.split(/\s+/)[0])));
      if (hit && !seen.has(norm(`med:${med.drug}`))) {
        seen.add(norm(`med:${med.drug}`));
        out.push({
          allergen: med.drug,
          reaction: `Active medication matches recorded allergy "${hit.allergen}"`,
          source: 'medication',
        });
      }
    }

    return out;
  }

  async createAllergy(pid: number, dto: any) {
    const allergen = normalizeKey(dto.allergen || '');
    if (allergen) {
      const existing = await this.dataSource.query(
        `SELECT id FROM lists WHERE pid = ? AND type = 'allergy' AND activity = 1 AND LOWER(title) = ? LIMIT 1`,
        [pid, allergen],
      );
      if (existing.length) {
        return { duplicate: true, existingId: existing[0].id, allergen: dto.allergen };
      }
    }
    const result = await this.dataSource.query(
      `INSERT INTO lists (pid, type, title, comments, date, begdate, activity)
       VALUES (?, 'allergy', ?, ?, NOW(), NOW(), 1)`,
      [pid, dto.allergen || '', dto.reaction || ''],
    );
    return { id: result.insertId };
  }

  async deleteAllergy(id: number) {
    await this.dataSource.query(`UPDATE lists SET activity = 0 WHERE id = ? AND type = 'allergy'`, [id]);
  }

  // ==================== Conditions / Diagnoses ====================

  async getConditions(pid: number) {
    return this.dataSource.query(
      `SELECT id, title as diagnosis, comments as note, type, date, begdate, enddate
      FROM lists WHERE pid = ? AND type = 'medical_problem' ORDER BY date DESC LIMIT 100`,
      [pid],
    );
  }

  async createCondition(pid: number, dto: any) {
    const diagnosis = normalizeKey(dto.diagnosis || '');
    if (diagnosis) {
      const existing = await this.dataSource.query(
        `SELECT id FROM lists WHERE pid = ? AND type = 'medical_problem' AND activity = 1 AND LOWER(title) = ? LIMIT 1`,
        [pid, diagnosis],
      );
      if (existing.length) {
        return { duplicate: true, existingId: existing[0].id, diagnosis: dto.diagnosis };
      }
    }
    const result = await this.dataSource.query(
      `INSERT INTO lists (pid, type, title, comments, date, begdate, activity)
       VALUES (?, 'medical_problem', ?, ?, NOW(), NOW(), 1)`,
      [pid, dto.diagnosis || '', dto.note || ''],
    );
    return { id: result.insertId };
  }

  async updateCondition(id: number, dto: any) {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of ['title', 'comments', 'enddate']) {
      if (dto[f] !== undefined) { sets.push(`${f === 'title' ? 'title' : f} = ?`); vals.push(dto[f]); }
    }
    if (!sets.length) return;
    vals.push(id);
    await this.dataSource.query(`UPDATE lists SET ${sets.join(', ')} WHERE id = ? AND type = 'medical_problem'`, vals);
  }

  async deleteCondition(id: number) {
    await this.dataSource.query(`UPDATE lists SET activity = 0 WHERE id = ? AND type = 'medical_problem'`, [id]);
  }

  // ==================== Immunizations ====================

  async getImmunizations(pid: number) {
    return this.dataSource.query(
      `SELECT id, LOWER(HEX(uuid)) as uuid, patient_id, administered_date,
        immunization_id, cvx_code, manufacturer, lot_number,
        administered_by, note, education_date, route, administration_site,
        completion_status, amount_administered, amount_administered_unit
      FROM immunizations WHERE patient_id = ? ORDER BY administered_date DESC LIMIT 100`,
      [pid],
    );
  }

  async createImmunization(pid: number, dto: any) {
    const result = await this.dataSource.query(
      `INSERT INTO immunizations (patient_id, administered_date, cvx_code,
        manufacturer, lot_number, administered_by, note, completion_status,
        route, administration_site, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [pid, dto.administered_date || null, dto.cvx_code || '',
       dto.manufacturer || '', dto.lot_number || '',
       dto.administered_by || '', dto.note || '',
       dto.completion_status || 'completed', dto.route || '',
       dto.administration_site || ''],
    );
    return { id: result.insertId };
  }

  async deleteImmunization(id: number) {
    await this.dataSource.query(`DELETE FROM immunizations WHERE id = ?`, [id]);
  }

  // ==================== Vitals History ====================

  async getVitalsHistory(pid: number) {
    return this.dataSource.query(
      `SELECT id, date, bps, bpd, weight, height, temperature, pulse,
        respiration, BMI, BMI_status, oxygen_saturation, note
      FROM form_vitals WHERE pid = ? ORDER BY date DESC LIMIT 200`,
      [pid],
    );
  }

  async createVital(pid: number, dto: any) {
    const result = await this.dataSource.query(
      `INSERT INTO form_vitals
        (pid, date, bps, bpd, weight, height, temperature, pulse, respiration,
         BMI, BMI_status, oxygen_saturation, note, activity, authorized)
       VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        pid,
        dto.bps || null,
        dto.bpd || null,
        dto.weight || 0,
        dto.height || 0,
        dto.temperature || 0,
        dto.pulse || 0,
        dto.respiration || 0,
        dto.BMI || 0,
        dto.BMI_status || null,
        dto.oxygen_saturation || 0,
        dto.note || null,
      ],
    );
    return { id: result.insertId };
  }
}
