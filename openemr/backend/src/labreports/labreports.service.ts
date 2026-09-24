import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LAB_CATALOG_SEED } from './lab-catalog.data';

@Injectable()
export class LabReportsService implements OnModuleInit {
  private readonly logger = new Logger(LabReportsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
    await this.seedCatalog();
  }

  private async ensureSchema(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS lab_test_catalog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(40) NOT NULL,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(60) NOT NULL,
        unit VARCHAR(30) NULL,
        ref_min DECIMAL(10,3) NULL,
        ref_max DECIMAL(10,3) NULL,
        ref_text VARCHAR(120) NULL,
        result_type VARCHAR(20) NOT NULL DEFAULT 'NUMERIC',
        options VARCHAR(255) NULL,
        display_order INT NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY uq_labtest_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS lab_result_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pid INT NOT NULL,
        patient_id INT NULL,
        lab_order_id INT NULL,
        lab_no VARCHAR(40) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        technician_id INT NULL,
        technician_name VARCHAR(120) NULL,
        verified_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_labreport_pid (pid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS lab_result_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        test_id INT NULL,
        code VARCHAR(40) NULL,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(60) NULL,
        unit VARCHAR(30) NULL,
        result_value VARCHAR(255) NULL,
        ref_min DECIMAL(10,3) NULL,
        ref_max DECIMAL(10,3) NULL,
        ref_text VARCHAR(120) NULL,
        flag VARCHAR(12) NULL,
        comments VARCHAR(255) NULL,
        display_order INT NOT NULL DEFAULT 0,
        INDEX idx_labitem_report (report_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS lab_result_audit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        patient_id INT NULL,
        lab_order_id INT NULL,
        report_id INT NULL,
        action VARCHAR(60) NULL,
        previous_value TEXT NULL,
        new_value TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    this.logger.log('Lab reports schema ready');
  }

  private async seedCatalog(): Promise<void> {
    // 1. Remove any stale catalog rows (tests from the deprecated seed) so the
    //    catalog matches the MJ-MC paper form EXACTLY — no extra/legacy tests.
    const codes = LAB_CATALOG_SEED.map((t) => t.code);
    if (codes.length > 0) {
      const placeholders = codes.map(() => '?').join(', ');
      await this.dataSource.query(
        `DELETE FROM lab_test_catalog WHERE code NOT IN (${placeholders})`,
        codes,
      );
    }

    // 2. Upsert every test in the exact form order. display_order is a single
    //    global sequence so the stored order reproduces the paper form.
    for (const t of LAB_CATALOG_SEED) {
      await this.dataSource.query(
        `INSERT INTO lab_test_catalog
          (code, name, category, unit, ref_min, ref_max, ref_text, result_type, options, display_order, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), category = VALUES(category), unit = VALUES(unit),
           ref_min = VALUES(ref_min), ref_max = VALUES(ref_max), ref_text = VALUES(ref_text),
           result_type = VALUES(result_type), options = VALUES(options), display_order = VALUES(display_order),
           active = 1`,
        [t.code, t.name, t.category, t.unit || null, t.refMin ?? null, t.refMax ?? null,
         t.refText || null, t.resultType, t.options || null, t.displayOrder],
      );
    }
    this.logger.log(`Lab test catalog seeded (${LAB_CATALOG_SEED.length} tests)`);
  }

  async getCatalog(category?: string): Promise<any[]> {
    // IMPORTANT: order by the explicit global display_order ONLY. Category must
    // never drive sorting, otherwise the MJ-MC form order would be altered.
    const rows = category
      ? await this.dataSource.query(
          `SELECT * FROM lab_test_catalog WHERE active = 1 AND category = ? ORDER BY display_order ASC, id ASC`,
          [category],
        )
      : await this.dataSource.query(
          `SELECT * FROM lab_test_catalog WHERE active = 1 ORDER BY display_order ASC, id ASC`,
        );
    return rows;
  }

  /** Tests ordered for a patient (procedure_order.patient_instructions carries the test name). */
  async getOrderedTestNames(pid: number): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT patient_instructions AS testName
       FROM procedure_order
       WHERE patient_id = ? AND activity = 1
         AND order_status NOT IN ('cancelled','rejected','duplicate')
       ORDER BY date_ordered DESC`,
      [pid],
    );
    return (rows as any[]).map(r => String(r.testName || '').trim()).filter(Boolean);
  }

  private computeFlag(resultType: string, value: string | null, refMin: number | null, refMax: number | null): string | null {
    if (value == null || value === '') return null;
    if (resultType === 'NUMERIC' && (refMin != null || refMax != null)) {
      const num = Number(value);
      if (isNaN(num)) return 'TEXT';
      if (refMin != null && num < refMin) return 'LOW';
      if (refMax != null && num > refMax) return 'HIGH';
      return 'NORMAL';
    }
    if (resultType === 'POSITIVE_NEGATIVE') {
      const v = value.toLowerCase();
      if (['negative', 'non-reactive', 'non reactive'].includes(v)) return 'NEGATIVE';
      if (['positive', 'reactive'].includes(v)) return 'POSITIVE';
      return 'TEXT';
    }
    return null;
  }

  async createReport(pid: number, dto: any): Promise<{ id: number; labNo: string }> {
    const [patient] = await this.dataSource.query(
      `SELECT pid, id FROM patient_data WHERE pid = ? LIMIT 1`, [pid],
    );
    if (!patient) throw new NotFoundException(`Patient #${pid} not found`);

    const [last] = await this.dataSource.query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM lab_result_reports`,
    );
    const labNo = dto.labNo || `MAJ-${new Date().getFullYear()}-${String(last?.nextId || 1).padStart(5, '0')}`;

    const items = Array.isArray(dto.items) ? dto.items : [];
    const status = dto.status === 'VERIFIED' ? 'VERIFIED' : 'DRAFT';

    const ins = await this.dataSource.query(
      `INSERT INTO lab_result_reports
        (pid, patient_id, lab_order_id, lab_no, status, technician_id, technician_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pid, patient.id, dto.labOrderId || null, labNo, status,
       dto.technicianId || null, dto.technicianName || null],
    );
    const reportId = ins.insertId;

    await this.saveItems(reportId, items);
    await this.audit(null, pid, dto.labOrderId || null, reportId, 'CREATE', null, `Report ${labNo} created (${status})`);

    if (status === 'VERIFIED') {
      await this.dataSource.query(
        `UPDATE lab_result_reports SET verified_at = NOW() WHERE id = ?`, [reportId],
      );
    }

    return { id: reportId, labNo };
  }

  private async saveItems(reportId: number, items: any[]): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      if (!it || (!it.testId && !it.code && !it.name)) continue;
      const flag = this.computeFlag(
        it.resultType || 'NUMERIC',
        it.resultValue ?? it.result_value ?? null,
        it.refMin ?? it.ref_min ?? null,
        it.refMax ?? it.ref_max ?? null,
      );
      await this.dataSource.query(
        `INSERT INTO lab_result_items
          (report_id, test_id, code, name, category, unit, result_value,
           ref_min, ref_max, ref_text, flag, comments, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reportId, it.testId ?? it.test_id ?? null, it.code || null,
         it.name || it.testName || 'Test', it.category || null, it.unit || null,
         it.resultValue ?? it.result_value ?? '',
         it.refMin ?? it.ref_min ?? null, it.refMax ?? it.ref_max ?? null,
         it.refText ?? it.ref_text ?? null, it.flag ?? flag, it.comments || null, i],
      );
    }
  }

  async updateReport(id: number, dto: any, userId: number | null): Promise<any> {
    const [report] = await this.dataSource.query(
      `SELECT * FROM lab_result_reports WHERE id = ? LIMIT 1`, [id],
    );
    if (!report) throw new NotFoundException(`Report #${id} not found`);

    const prev = await this.getReportItems(id);
    await this.dataSource.query(`DELETE FROM lab_result_items WHERE report_id = ?`, [id]);

    const items = Array.isArray(dto.items) ? dto.items : [];
    await this.saveItems(id, items);
    await this.audit(userId, report.pid, report.lab_order_id, id, 'UPDATE',
      JSON.stringify(prev), JSON.stringify(items));

    return { id, status: report.status };
  }

  async verifyReport(id: number, dto: any, userId: number | null): Promise<any> {
    const [report] = await this.dataSource.query(
      `SELECT * FROM lab_result_reports WHERE id = ? LIMIT 1`, [id],
    );
    if (!report) throw new NotFoundException(`Report #${id} not found`);

    const technicianName = dto?.technicianName || report.technician_name || null;
    await this.dataSource.query(
      `UPDATE lab_result_reports SET status = 'VERIFIED', verified_at = NOW(),
         technician_id = ?, technician_name = ? WHERE id = ?`,
      [dto?.technicianId ?? report.technician_id ?? userId, technicianName, id],
    );
    await this.audit(userId, report.pid, report.lab_order_id, id, 'VERIFY',
      report.status, 'VERIFIED');
    return { id, status: 'VERIFIED' };
  }

  async getReports(pid: number): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT r.*, pd.fname, pd.lname, pd.DOB, pd.sex, pd.public_id,
              (SELECT COUNT(*) FROM lab_result_items i WHERE i.report_id = r.id) AS item_count
       FROM lab_result_reports r
       LEFT JOIN patient_data pd ON pd.pid = r.pid
       WHERE r.pid = ?
       ORDER BY r.created_at DESC, r.id DESC`,
      [pid],
    );
    return rows;
  }

  async getReportItems(id: number): Promise<any[]> {
    return this.dataSource.query(
      `SELECT * FROM lab_result_items WHERE report_id = ? ORDER BY display_order ASC`, [id],
    );
  }

  async getReport(id: number): Promise<any> {
    const [report] = await this.dataSource.query(
      `SELECT r.*, pd.fname, pd.lname, pd.DOB, pd.sex, pd.public_id, pd.id AS patient_id
       FROM lab_result_reports r
       LEFT JOIN patient_data pd ON pd.pid = r.pid
       WHERE r.id = ? LIMIT 1`, [id],
    );
    if (!report) throw new NotFoundException(`Report #${id} not found`);
    const items = await this.getReportItems(id);
    return { ...report, items };
  }

  private async audit(userId: number | null, patientId: number | null, labOrderId: number | null,
    reportId: number | null, action: string, previousValue: string | null, newValue: string | null): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO lab_result_audit (user_id, patient_id, lab_order_id, report_id, action, previous_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, patientId, labOrderId, reportId, action, previousValue, newValue],
    );
  }
}
