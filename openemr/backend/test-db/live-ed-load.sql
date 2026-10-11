-- ---------------------------------------------------------------------------
-- OpenRx live/dev ED load (50 patients) — for a POPULATED database
-- ---------------------------------------------------------------------------
-- Unlike ed-load-seed.sql (which assumes a fresh test DB and uses pids 10..59),
-- this loader is safe to run against a database that already has patients. It
-- uses a high, non-colliding pid range (900001+) and never issues an
-- unconditional INSERT over an existing pid, so no real chart is overwritten.
--
-- It targets the database the running app uses (the UI proxies /api to the
-- NestJS backend, whose .env points at MySQL :8320). Lay out exactly what the
-- dashboards read:
--   * patient_data           — 50 active patients, registered to an existing
--                              physician
--   * form_vitals            — one charted set each
--   * patient_care_assignment— room + acuity + assigned nurse (nurse dashboard)
--   * emergency_visits       — one active ED visit each (ED board + provider)
--
-- Clinicians are resolved by username, so no user rows are created:
--   physician        dr.chen      (provider dashboard / ED visits)
--   assigned nurse   nurse.amy    (nursing assistant dashboard = role "nurse")
--   charge nurse     rn.patricia  (RN dashboard)
--
-- Re-runnable: fixed pids/vitals ids (ON DUPLICATE KEY UPDATE) and the visits
-- carry created_by = 'ed-load'. To remove everything this file adds:
--   DELETE FROM emergency_visits WHERE created_by='ed-load';
--   DELETE FROM patient_care_assignment WHERE pid BETWEEN 900001 AND 900050;
--   DELETE FROM form_vitals      WHERE pid BETWEEN 900001 AND 900050;
--   DELETE FROM patient_data     WHERE pid BETWEEN 900001 AND 900050;
--
-- Change the count in ONE place: the `n < 50` below.
-- ---------------------------------------------------------------------------

SET @prov   := (SELECT id FROM users WHERE BINARY username = 'dr.chen'      LIMIT 1);
SET @nurse  := (SELECT id FROM users WHERE BINARY username = 'nurse.amy'    LIMIT 1);
SET @charge := (SELECT id FROM users WHERE BINARY username = 'rn.patricia'  LIMIT 1);
SET @pid_base := 900000;   -- first pid is 900001; well clear of existing pids

DROP TEMPORARY TABLE IF EXISTS ed_seq;
CREATE TEMPORARY TABLE ed_seq (n INT PRIMARY KEY);
INSERT INTO ed_seq (n)
WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < 50)
SELECT n FROM c;

-- 1. Patients -----------------------------------------------------------------
INSERT INTO patient_data
    (pid, pubpid, fname, lname, mname, DOB, sex,
     street, city, state, postal_code, phone_home, phone_contact, email,
     public_id, insurance_type, patient_responsibility_percent, approved_at,
     status, regdate, providerID, provider_since_date)
SELECT
    @pid_base + s.n,
    CONCAT('RX-ED-', LPAD(s.n, 5, '0')),
    ELT(((s.n - 1) % 12) + 1, 'James', 'Mary', 'Robert', 'Patricia', 'Michael',
        'Jennifer', 'William', 'Linda', 'David', 'Elizabeth', 'Richard', 'Barbara'),
    ELT(((s.n - 1) % 12) + 1, 'Anderson', 'Bennett', 'Carter', 'Daniels', 'Edwards',
        'Foster', 'Grant', 'Hayes', 'Irvine', 'Jenkins', 'Kelly', 'Lawson'),
    CHAR(65 + (s.n % 26)),
    DATE_SUB(CURDATE(), INTERVAL (18 + (s.n * 7) % 70) YEAR),
    IF(s.n % 2 = 0, 'Male', 'Female'),
    CONCAT(s.n, ' Emergency Way'), 'Testville', 'TS', '00001',
    CONCAT('555-1', LPAD(s.n, 3, '0')), CONCAT('555-2', LPAD(s.n, 3, '0')),
    CONCAT('ed.load', s.n, '@example.test'),
    CONCAT('RX-2608-E', LPAD(s.n, 5, '0')),
    IF(s.n % 3 = 0, 'self_pay', 'insured'), IF(s.n % 3 = 0, 100, 20),
    NOW(), 'active', NOW() - INTERVAL s.n DAY,
    @prov, NOW() - INTERVAL s.n DAY
FROM ed_seq s
ON DUPLICATE KEY UPDATE
    fname      = VALUES(fname),
    lname      = VALUES(lname),
    status     = VALUES(status),
    providerID = VALUES(providerID);

-- 2. Vitals -------------------------------------------------------------------
INSERT INTO form_vitals
    (id, pid, date, bps, bpd, pulse, respiration, temperature,
     oxygen_saturation, weight, height, BMI, note, activity, authorized)
SELECT
    9200000 + s.n, @pid_base + s.n, NOW() - INTERVAL (s.n * 2) MINUTE,
    100 + (s.n * 7) % 80,
    60 + (s.n * 5) % 40,
    60 + (s.n * 11) % 70,
    12 + (s.n * 3) % 12,
    36.0 + (s.n % 25) / 10,
    88 + (s.n * 3) % 13,
    50 + (s.n * 7) % 80,
    150 + (s.n * 5) % 45,
    ROUND((50 + (s.n * 7) % 80) / POW((150 + (s.n * 5) % 45) / 100, 2), 1),
    'ED triage vitals', 1, 1
FROM ed_seq s
ON DUPLICATE KEY UPDATE
    date              = VALUES(date),
    bps               = VALUES(bps),
    bpd               = VALUES(bpd),
    pulse             = VALUES(pulse),
    respiration       = VALUES(respiration),
    temperature       = VALUES(temperature),
    oxygen_saturation = VALUES(oxygen_saturation),
    weight            = VALUES(weight),
    height            = VALUES(height),
    BMI               = VALUES(BMI);

-- 3. Ward assignment (nurse dashboard: room, acuity, assigned to me) ----------
INSERT INTO patient_care_assignment
    (pid, room, assigned_nurse_id, charge_nurse_id, acuity_level, acuity_score,
     updated_at, updated_by)
SELECT
    @pid_base + s.n,
    CONCAT('ED-', 100 + s.n),
    @nurse, @charge,
    ELT(((s.n - 1) % 5) + 1, 'stat', 'stat', 'urgent', 'routine', 'routine'),
    105 - (((s.n - 1) % 5) + 1) * 15,
    NOW(), @prov
FROM ed_seq s
ON DUPLICATE KEY UPDATE
    room              = VALUES(room),
    assigned_nurse_id = VALUES(assigned_nurse_id),
    charge_nurse_id   = VALUES(charge_nurse_id),
    acuity_level      = VALUES(acuity_level),
    acuity_score      = VALUES(acuity_score),
    updated_at        = NOW(),
    updated_by        = VALUES(updated_by);

-- 4. Active ED visit (board + provider dashboard) -----------------------------
DELETE FROM emergency_visits WHERE created_by = 'ed-load';

INSERT INTO emergency_visits
    (pid, patient_id, arrived_at, mode, chief_complaint, esi_level, color, label,
     triage_score, news2, shock_index, target_minutes, reassess_minutes, acuity,
     bypass, modifiers, reasons, needs_vitals, resources, vitals, vitals_source,
     status, room, provider_id, triaged_at, first_seen_at, created_by)
SELECT
    @pid_base + e.n,
    (SELECT id FROM patient_data WHERE pid = @pid_base + e.n LIMIT 1),
    NOW() - INTERVAL (e.n * 3) MINUTE,
    ELT(((e.n - 1) % 3) + 1, 'walk-in', 'ambulance', 'walk-in'),
    ELT(((e.n - 1) % 10) + 1, 'Chest pain', 'Shortness of breath', 'Abdominal pain',
        'Fever', 'Head injury', 'Laceration', 'Dizziness', 'Vomiting', 'Back pain',
        'Suspected fracture'),
    e.esi,
    ELT(e.esi, '#dc3545', '#fd7e14', '#ffc107', '#198754', '#0dcaf0'),
    ELT(e.esi, 'Red', 'Orange', 'Yellow', 'Green', 'Blue'),
    105 - e.esi * 10,
    e.n % 12,
    NULL,
    ELT(e.esi, 0, 10, 30, 60, 120),
    ELT(e.esi, 0, 15, 30, 60, 60),
    ELT(e.esi, 'stat', 'stat', 'urgent', 'routine', 'routine'),
    JSON_ARRAY(), JSON_ARRAY(), JSON_ARRAY(),
    IF(e.n % 4 = 0, 1, 0),
    e.n % 5,
    JSON_OBJECT(
        'bps', 100 + (e.n * 7) % 80,
        'bpd', 60 + (e.n * 5) % 40,
        'pulse', 60 + (e.n * 11) % 70,
        'respiration', 12 + (e.n * 3) % 12,
        'temperature', 36.0 + (e.n % 25) / 10,
        'oxygen_saturation', 88 + (e.n * 3) % 13),
    'triage',
    ELT(((e.n - 1) % 3) + 1, 'waiting', 'in_treatment', 'observation'),
    CONCAT('ED-', 100 + e.n),
    @prov,
    NOW() - INTERVAL (e.n * 3 - 2) MINUTE,
    CASE WHEN ((e.n - 1) % 3) + 1 = 1 THEN NULL
         ELSE NOW() - INTERVAL (e.n * 3 - 8) MINUTE END,
    'ed-load'
FROM (SELECT s.n, ((s.n - 1) % 5) + 1 AS esi FROM ed_seq s) e;

DROP TEMPORARY TABLE IF EXISTS ed_seq;

