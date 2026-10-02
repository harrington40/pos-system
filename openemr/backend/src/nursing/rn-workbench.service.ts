import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { computeNews2 } from '../emergency/triage-acuity.util';
import {
    bradenScore,
    buildHandover,
    deteriorationTrend,
    fluidBalance,
    morseFallRisk,
    observationDue,
    prioritiseTasks,
    safetyBanner,
    sepsisScreen,
} from './nursing-safety.util';
import type {
    BradenInput,
    Handover,
    MorseInput,
    NurseTask,
} from './nursing-safety.util';

/** `patient_flags` row. */
export interface PatientFlagsRow {
    pid: number;
    code_status: string | null;
    isolation: string | null;
}

/** `patient_safety_assessments` row. */
interface SafetyRow {
    id: number;
    pid: number;
    kind: string;
    score: number;
    level: string;
    data_json: string | null;
    assessed_at: string;
}

/** `patient_intake_output` row. */
interface IoRow {
    id: number;
    pid: number;
    kind: string;
    category: string | null;
    volume_ml: number;
    note: string | null;
    recorded_at: string;
}

/** `nurse_tasks` row. */
interface TaskRow {
    id: number;
    pid: number | null;
    assigned_to: number | null;
    kind: string;
    title: string;
    detail: string | null;
    priority: number;
    status: string;
    due_at: string | null;
    created_at: string;
}

/** Ward patient row used when building the safety board. */
interface WardRow {
    pid: number;
    fname: string;
    lname: string;
    room: string | null;
    acuity_level: string | null;
    last_vital_date: string | null;
    bps: number | string | null;
    bpd: number | string | null;
    pulse: number | string | null;
    temperature: number | string | null;
    respiration: number | string | null;
    oxygen_saturation: number | string | null;
}

/** Affected-rows result. */
interface AffectedRowsResult {
    affectedRows: number;
    insertId: number;
}

export interface IoDto {
    kind?: string;
    category?: string;
    volumeMl?: number | string;
    note?: string;
}

export interface TaskDto {
    pid?: number | null;
    assignedTo?: number | null;
    kind?: string;
    title?: string;
    detail?: string | null;
    priority?: number | string;
    dueAt?: string | null;
}

export interface FlagsDto {
    codeStatus?: string | null;
    isolation?: string | null;
}

/** Reassessment cadence (minutes) implied by the care acuity. */
const CADENCE_MINUTES: Record<string, number> = {
    stat: 15,
    urgent: 30,
    routine: 120,
};

function cadenceFor(acuity: string | null | undefined): number {
    return CADENCE_MINUTES[String(acuity || 'routine')] ?? 120;
}

@Injectable()
export class RnWorkbenchService implements OnModuleInit {
    private readonly logger = new Logger(RnWorkbenchService.name);

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async onModuleInit(): Promise<void> {
        await this.ensureSchema();
    }

    /** Create the workbench tables if they do not yet exist. */
    async ensureSchema(): Promise<void> {
        await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS patient_flags (
        pid INT NOT NULL PRIMARY KEY,
        code_status VARCHAR(40) NULL,
        isolation VARCHAR(80) NULL,
        updated_at DATETIME NULL,
        updated_by INT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS patient_safety_assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pid INT NOT NULL,
        kind VARCHAR(20) NOT NULL,
        score INT NOT NULL DEFAULT 0,
        level VARCHAR(20) NOT NULL DEFAULT 'low',
        data_json MEDIUMTEXT NULL,
        assessed_by INT NULL,
        assessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_safety_pid_kind (pid, kind, assessed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS patient_intake_output (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pid INT NOT NULL,
        kind VARCHAR(10) NOT NULL,
        category VARCHAR(60) NULL,
        volume_ml INT NOT NULL DEFAULT 0,
        note VARCHAR(255) NULL,
        recorded_by INT NULL,
        recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_io_pid (pid, recorded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS nurse_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pid INT NULL,
        assigned_to INT NULL,
        kind VARCHAR(20) NOT NULL DEFAULT 'other',
        title VARCHAR(160) NOT NULL,
        detail TEXT NULL,
        priority INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        due_at DATETIME NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        updated_at DATETIME NULL,
        INDEX idx_task_assigned (assigned_to, status),
        INDEX idx_task_pid (pid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        this.logger.log('RN workbench schema ready');
    }

    // ── Flags: code status / isolation ─────────────────────────────────────

    async getFlags(pid: number): Promise<PatientFlagsRow> {
        const rows = await this.dataSource.query<PatientFlagsRow[]>(
            `SELECT pid, code_status, isolation FROM patient_flags WHERE pid = ?`,
            [pid],
        );
        return rows[0] || { pid, code_status: null, isolation: null };
    }

    async setFlags(pid: number, dto: FlagsDto, actorId?: number) {
        await this.dataSource.query(
            `INSERT INTO patient_flags (pid, code_status, isolation, updated_at, updated_by)
       VALUES (?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         code_status = VALUES(code_status),
         isolation = VALUES(isolation),
         updated_at = NOW(),
         updated_by = VALUES(updated_by)`,
            [pid, dto?.codeStatus || null, dto?.isolation || null, actorId ?? null],
        );
        return this.getFlags(pid);
    }

    // ── Safety assessments: fall risk / Braden ──────────────────────────────

    async getSafety(pid: number) {
        const latest = async (kind: string) =>
            (
                await this.dataSource.query<SafetyRow[]>(
                    `SELECT id, pid, kind, score, level, data_json,
                DATE_FORMAT(assessed_at, '%Y-%m-%d %H:%i') AS assessed_at
           FROM patient_safety_assessments
          WHERE pid = ? AND kind = ?
          ORDER BY assessed_at DESC, id DESC LIMIT 1`,
                    [pid, kind],
                )
            )[0] || null;
        const parse = (r: SafetyRow | null) =>
            r ? { ...r, data: r.data_json ? JSON.parse(r.data_json) : null } : null;
        return { fall: parse(await latest('fall')), braden: parse(await latest('braden')) };
    }

    /** Score and store a fall (Morse) or Braden assessment. */
    async saveSafety(
        pid: number,
        kind: string,
        data: MorseInput & BradenInput,
        actorId?: number,
    ) {
        const k = String(kind || '').toLowerCase();
        if (k !== 'fall' && k !== 'braden') {
            throw new BadRequestException('kind must be "fall" or "braden"');
        }
        const result =
            k === 'fall' ? morseFallRisk(data) : bradenScore(data);
        const level =
            k === 'fall'
                ? (result as { level: string }).level
                : (result as { risk: string }).risk;
        const row = await this.dataSource.query<AffectedRowsResult>(
            `INSERT INTO patient_safety_assessments
         (pid, kind, score, level, data_json, assessed_by, assessed_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [pid, k, result.score, level, JSON.stringify(data || {}), actorId ?? null],
        );
        return { id: row.insertId, pid, kind: k, score: result.score, level };
    }

    // ── Intake / output ─────────────────────────────────────────────────────

    async getIO(pid: number, hours = 24) {
        const take = Math.min(Math.max(Number(hours) || 24, 1), 168);
        const rows = await this.dataSource.query<IoRow[]>(
            `SELECT id, pid, kind, category, volume_ml, note,
              DATE_FORMAT(recorded_at, '%Y-%m-%d %H:%i') AS recorded_at
       FROM patient_intake_output
       WHERE pid = ? AND recorded_at >= (NOW() - INTERVAL ${take} HOUR)
       ORDER BY recorded_at DESC`,
            [pid],
        );
        const intake = rows
            .filter((r) => r.kind === 'intake')
            .reduce((s, r) => s + (Number(r.volume_ml) || 0), 0);
        const output = rows
            .filter((r) => r.kind === 'output')
            .reduce((s, r) => s + (Number(r.volume_ml) || 0), 0);
        return { hours: take, entries: rows, balance: fluidBalance(intake, output) };
    }

    async addIO(pid: number, dto: IoDto, actorId?: number) {
        const kind = String(dto?.kind || '').toLowerCase();
        if (kind !== 'intake' && kind !== 'output') {
            throw new BadRequestException('kind must be "intake" or "output"');
        }
        const volume = Number(dto?.volumeMl);
        if (!Number.isFinite(volume) || volume <= 0) {
            throw new BadRequestException('volumeMl must be greater than 0');
        }
        const row = await this.dataSource.query<AffectedRowsResult>(
            `INSERT INTO patient_intake_output
         (pid, kind, category, volume_ml, note, recorded_by, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                pid,
                kind,
                dto?.category ? String(dto.category).slice(0, 60) : null,
                Math.round(volume),
                dto?.note ? String(dto.note).slice(0, 255) : null,
                actorId ?? null,
            ],
        );
        return { id: row.insertId, pid, kind, volumeMl: Math.round(volume) };
    }


    // ── Tasks ───────────────────────────────────────────────────────────────

    /** Open tasks for a nurse (or unassigned), ordered by clinical urgency. */
    async listTasks(nurseId: number, includeDone = false) {
        const rows = await this.dataSource.query<TaskRow[]>(
            `SELECT id, pid, assigned_to, kind, title, detail, priority, status,
              due_at, created_at
       FROM nurse_tasks
       WHERE (? = 1 OR assigned_to IS NULL OR assigned_to = 0 OR assigned_to = ?)
         ${includeDone ? '' : "AND status <> 'done'"}
       ORDER BY due_at IS NULL, due_at, priority DESC, id DESC
       LIMIT 200`,
            [nurseId > 0 ? 0 : 1, nurseId],
        );
        const byId = new Map(rows.map((r) => [r.id, r]));
        const ordered = prioritiseTasks(
            rows.map((r) => ({
                id: r.id,
                kind: r.kind as NurseTask['kind'],
                title: r.title,
                priority: r.priority,
                dueAt: r.due_at,
                status: r.status,
            })),
        );
        return ordered.map((t) => ({ ...t, row: byId.get(Number(t.id)) }));
    }

    async createTask(dto: TaskDto, actorId?: number) {
        const title = String(dto?.title || '').trim();
        if (!title) throw new BadRequestException('title is required');
        const row = await this.dataSource.query<AffectedRowsResult>(
            `INSERT INTO nurse_tasks
         (pid, assigned_to, kind, title, detail, priority, status, due_at,
          created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, NOW())`,
            [
                dto?.pid ?? null,
                dto?.assignedTo ?? null,
                String(dto?.kind || 'other').slice(0, 20),
                title.slice(0, 160),
                dto?.detail ? String(dto.detail) : null,
                Number(dto?.priority) || 0,
                dto?.dueAt || null,
                actorId ?? null,
            ],
        );
        return { id: row.insertId, ...dto, title, status: 'open' };
    }

    async completeTask(id: number) {
        const row = await this.dataSource.query<AffectedRowsResult>(
            `UPDATE nurse_tasks
       SET status = 'done', completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
            [id],
        );
        if (!row.affectedRows) throw new NotFoundException(`Task #${id} not found`);
        return { id, status: 'done' };
    }

    /** Escalate a patient: files a high-priority task for the responsible nurse. */
    async escalate(pid: number, reason: string, actorId?: number) {
        const [pac] = await this.dataSource.query<
            { assigned_nurse_id: number | null; fname: string; lname: string }[]
        >(
            `SELECT ca.assigned_nurse_id, pd.fname, pd.lname
       FROM patient_data pd
       LEFT JOIN patient_care_assignment ca ON ca.pid = pd.pid
       WHERE pd.pid = ? LIMIT 1`,
            [pid],
        );
        if (!pac) throw new NotFoundException(`Patient #${pid} not found`);
        const name = `${pac.fname || ''} ${pac.lname || ''}`.trim();
        const task = await this.createTask(
            {
                pid,
                assignedTo: pac.assigned_nurse_id ?? actorId ?? null,
                kind: 'escalation',
                title: `Escalation — ${name || `Patient #${pid}`}`,
                detail: String(reason || 'Escalated from the RN dashboard').slice(0, 500),
                priority: 10,
            },
            actorId,
        );
        this.logger.warn(`Patient #${pid} escalated: ${reason}`);
        return task;
    }


    // ── Handover (SBAR) ─────────────────────────────────────────────────────

    async getHandover(pid: number): Promise<Handover> {
        const [patient] = await this.dataSource.query<
            {
                fname: string;
                lname: string;
                DOB: string | null;
                sex: string | null;
                room: string | null;
                acuity_level: string | null;
            }[]
        >(
            `SELECT pd.fname, pd.lname, pd.DOB, pd.sex, ca.room, ca.acuity_level
       FROM patient_data pd
       LEFT JOIN patient_care_assignment ca ON ca.pid = pd.pid
       WHERE pd.pid = ? LIMIT 1`,
            [pid],
        );
        if (!patient) throw new NotFoundException(`Patient #${pid} not found`);

        const allergies = (
            await this.dataSource.query<{ allergen: string }[]>(
                `SELECT title AS allergen FROM lists
          WHERE pid = ? AND type = 'allergy' AND (activity IS NULL OR activity = 1)
          LIMIT 10`,
                [pid],
            )
        ).map((r) => r.allergen);

        const meds = (
            await this.dataSource.query<{ drug: string }[]>(
                `SELECT drug FROM prescriptions
          WHERE patient_id = ? AND active = 1 LIMIT 15`,
                [pid],
            )
        ).map((r) => r.drug);

        const [vitals] = await this.dataSource.query<
            {
                bps: string | null;
                bpd: string | null;
                pulse: string | null;
                temperature: string | null;
                respiration: string | null;
                oxygen_saturation: string | null;
            }[]
        >(
            `SELECT bps, bpd, pulse, temperature, respiration, oxygen_saturation
       FROM form_vitals WHERE pid = ? ORDER BY date DESC, id DESC LIMIT 1`,
            [pid],
        );

        const outstanding = await this.dataSource
            .query<{ n: number }[]>(
                `SELECT COUNT(*) AS n FROM medication_administration_orders
          WHERE pid = ? AND status = 'active' AND next_due_at <= NOW()`,
                [pid],
            )
            .catch(() => [{ n: 0 }]);

        const flags = await this.getFlags(pid);
        const news2 = vitals
            ? computeNews2({
                  respiration: vitals.respiration,
                  oxygen_saturation: vitals.oxygen_saturation,
                  temperature: vitals.temperature,
                  bps: vitals.bps,
                  pulse: vitals.pulse,
              } as never)
            : null;
        const latestVitals = vitals
            ? [
                  vitals.bps && `BP ${vitals.bps}/${vitals.bpd ?? '—'}`,
                  vitals.pulse && `HR ${vitals.pulse}`,
                  vitals.temperature && `T ${vitals.temperature}`,
                  vitals.respiration && `RR ${vitals.respiration}`,
                  vitals.oxygen_saturation && `SpO₂ ${vitals.oxygen_saturation}%`,
              ]
                  .filter(Boolean)
                  .join(', ')
            : null;

        const ageYears = patient.DOB
            ? Math.max(
                  0,
                  Math.floor(
                      (Date.now() - new Date(patient.DOB).getTime()) /
                          (365.25 * 24 * 3600 * 1000),
                  ),
              )
            : null;

        return buildHandover({
            patientName: `${patient.fname || ''} ${patient.lname || ''}`.trim(),
            room: patient.room,
            ageYears,
            sex: patient.sex,
            acuityLevel: patient.acuity_level,
            allergies,
            currentMeds: meds,
            latestVitals,
            latestNews2: news2 ? news2.total : null,
            outstandingMeds: Number(outstanding?.[0]?.n) || 0,
            codeStatus: flags.code_status,
            isolation: flags.isolation,
        });
    }


    // ── Workload ────────────────────────────────────────────────────────────

    /** Per-nurse load: assigned patients and open tasks (for rebalancing). */
    async workload() {
        const rows = await this.dataSource.query<
            {
                id: number;
                fname: string;
                lname: string;
                patients: number | string;
                tasks: number | string;
            }[]
        >(
            `SELECT u.id, u.fname, u.lname,
              (SELECT COUNT(*) FROM patient_care_assignment ca
                WHERE ca.assigned_nurse_id = u.id) AS patients,
              (SELECT COUNT(*) FROM nurse_tasks t
                WHERE t.assigned_to = u.id AND t.status <> 'done') AS tasks
       FROM users u
       WHERE u.active = 1 AND u.authorized = 1
         AND u.main_menu_role IN ('nurse', 'registered_nurse')
       ORDER BY patients DESC, tasks DESC`,
        );
        return rows.map((r) => ({
            id: r.id,
            name: `${r.fname || ''} ${r.lname || ''}`.trim(),
            patients: Number(r.patients) || 0,
            tasks: Number(r.tasks) || 0,
        }));
    }


    // ── Dashboard aggregation ───────────────────────────────────────────────

    /**
     * The safety/workflow board for the RN workspace. Reuses the ward rows the
     * dashboard already fetched, and adds: overdue observations, septic screens,
     * a NEWS2 trend per patient, code/isolation flags, the task list and the
     * per-nurse workload.
     */
    async getWorkbench(nurseId: number, patients: WardRow[] = []) {
        const list = patients || [];
        const pids = list.map((p) => p.pid).filter((n) => Number.isFinite(n));
        if (!pids.length) {
            return {
                vitalsDue: [],
                deterioration: [],
                sepsis: [],
                flags: {},
                tasks: await this.listTasks(nurseId),
                workload: await this.workload(),
            };
        }
        const placeholders = pids.map(() => '?').join(',');

        // Last 48h of vitals, newest first, so a per-patient trend can be scored.
        const vitals = await this.dataSource
            .query<
                {
                    pid: number;
                    respiration: string | null;
                    oxygen_saturation: string | null;
                    temperature: string | null;
                    bps: string | null;
                    bpd: string | null;
                    pulse: string | null;
                }[]
            >(
                `SELECT pid, respiration, oxygen_saturation, temperature, bps, bpd, pulse
           FROM form_vitals
          WHERE pid IN (${placeholders}) AND date >= (NOW() - INTERVAL 48 HOUR)
          ORDER BY pid, date DESC, id DESC`,
                pids,
            )
            .catch(() => []);

        const historyByPid = new Map<number, number[]>();
        for (const v of vitals) {
            const score = computeNews2({
                respiration: v.respiration,
                oxygen_saturation: v.oxygen_saturation,
                temperature: v.temperature,
                bps: v.bps,
                pulse: v.pulse,
            } as never).total;
            const arr = historyByPid.get(v.pid) || [];
            if (arr.length < 2) arr.push(score);
            historyByPid.set(v.pid, arr);
        }

        const flagRows = await this.dataSource
            .query<PatientFlagsRow[]>(
                `SELECT pid, code_status, isolation FROM patient_flags
          WHERE pid IN (${placeholders})`,
                pids,
            )
            .catch(() => []);
        const flags: Record<number, PatientFlagsRow> = {};
        for (const f of flagRows) flags[f.pid] = f;

        const now = new Date();
        const vitalsDue: { state: string }[] = [];
        const deterioration: unknown[] = [];
        const sepsis: unknown[] = [];

        for (const p of list) {
            const name = `${p.fname || ''} ${p.lname || ''}`.trim();
            const cadence = cadenceFor(p.acuity_level);

            const due = observationDue(p.last_vital_date, cadence, now);
            if (due.state !== 'ok') {
                vitalsDue.push({
                    pid: p.pid,
                    patient_name: name,
                    room: p.room,
                    acuity_level: p.acuity_level,
                    last_vital_date: p.last_vital_date,
                    cadence_minutes: cadence,
                    state: due.state,
                    minutes_until: due.minutesUntil,
                } as unknown as { state: string });
            }

            const hist = historyByPid.get(p.pid) || [];
            if (hist.length >= 2) {
                const t = deteriorationTrend([
                    { total: hist[0] },
                    { total: hist[1] },
                ]);
                if (t.trend === 'worsening') {
                    deterioration.push({
                        pid: p.pid,
                        patient_name: name,
                        room: p.room,
                        trend: t.trend,
                        delta: t.delta,
                        latest: t.latest,
                        previous: t.previous,
                    });
                }
            }

            const temp = Number(p.temperature);
            const infectionSuspected = Number.isFinite(temp)
                ? (temp > 45 ? ((temp - 32) * 5) / 9 : temp) >= 38.3
                : false;
            const screen = sepsisScreen(
                {
                    respiration: p.respiration,
                    oxygen_saturation: p.oxygen_saturation,
                    temperature: p.temperature,
                    bps: p.bps,
                    bpd: p.bpd,
                    pulse: p.pulse,
                },
                infectionSuspected,
            );
            if (screen.risk !== 'none') {
                sepsis.push({
                    pid: p.pid,
                    patient_name: name,
                    room: p.room,
                    risk: screen.risk,
                    score: screen.score,
                    flags: screen.flags,
                });
            }
        }

        const rank: Record<string, number> = { overdue: 0, due: 1, never: 2 };
        vitalsDue.sort(
            (a, b) => (rank[a.state] ?? 3) - (rank[b.state] ?? 3),
        );

        return {
            vitalsDue,
            deterioration,
            sepsis,
            flags,
            tasks: await this.listTasks(nurseId),
            workload: await this.workload(),
        };
    }
}

