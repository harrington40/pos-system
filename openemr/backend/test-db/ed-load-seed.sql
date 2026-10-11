-- ---------------------------------------------------------------------------
-- OpenRx emergency-department load (50 synthetic patients) — run AFTER boot
-- ---------------------------------------------------------------------------
-- Bulk, generated ED data for load/UX testing. Every patient is an `active`
-- patient_data row with a charted set of vitals and a ward assignment, so all 50
-- appear on the nursing dashboards (/nurse/dashboard → NurseAideDashboardPage /
-- NurseRNDashboardPage) as well as the ED board and Dr. Chan's provider
-- dashboard.
--
-- Depends on:
--   * seed.sql    — for dr.chan / rn.nurse / rn.charge
--   * a booted backend — for emergency_visits, emergency_reassessments and
--                        patient_care_assignment (created via CREATE TABLE IF NOT
--                        EXISTS on boot), which is why this is a post-boot file
--                        (see seed-ed-load.sh).
--
-- Patients take pids 10..59 (the six curated demo patients in demo-seed.sql use
-- 4..9). Everything is deterministic, so the data is identical on every run and
-- the file is safe to re-run: the pids are fixed (ON DUPLICATE KEY UPDATE) and
-- the visits carry the marker `created_by = 'ed-load'`.
--
-- Change the count in ONE place — the `n < 50` below — to grow or shrink the set.
-- ---------------------------------------------------------------------------

SET @chan   := (SELECT id FROM users WHERE BINARY username = 'dr.chan');
SET @nurse  := (SELECT id FROM users WHERE BINARY username = 'rn.nurse');
SET @charge := (SELECT id FROM users WHERE BINARY username = 'rn.charge');

-- A reusable 1..50 counter (the file runs on a single connection).
DROP TEMPORARY TABLE IF EXISTS ed_seq;
CREATE TEMPORARY TABLE ed_seq (n INT PRIMARY KEY);
INSERT INTO ed_seq (n)
WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < 50)
SELECT n FROM c;

-- ---------------------------------------------------------------------------
-- 1. Patients (pid 10..59), registered to Dr. Chan
-- ---------------------------------------------------------------------------
INSERT INTO patient_data
    (pid, pubpid, fname, lname, mname, DOB, sex,
     street, city, state, postal_code, phone_home, phone_contact, email,
     public_id, insurance_type, patient_responsibility_percent, approved_at,
     status, regdate, providerID, provider_since_date)
SELECT
    9 + s.n,
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
    CONCAT('ed.patient', s.n, '@example.test'),
    CONCAT('RX-2608-E', LPAD(s.n, 5, '0')),
    IF(s.n % 3 = 0, 'self_pay', 'insured'), IF(s.n % 3 = 0, 100, 20),
    NOW(), 'active', NOW() - INTERVAL s.n DAY,
    @chan, NOW() - INTERVAL s.n DAY
FROM ed_seq s
ON DUPLICATE KEY UPDATE
    fname      = VALUES(fname),
    lname      = VALUES(lname),
    status     = VALUES(status),
    providerID = VALUES(providerID);

-- ---------------------------------------------------------------------------
-- 2. One charted set of vitals per patient (fixed ids 9101..9150)
-- ---------------------------------------------------------------------------
-- Values cycle deterministically through clinically plausible ranges so the
-- dashboards show a spread of normal/abnormal readings and NEWS2 risk bands.
INSERT INTO form_vitals
    (id, pid, date, bps, bpd, pulse, respiration, temperature,
     oxygen_saturation, weight, height, BMI, note, activity, authorized)
SELECT
    9100 + s.n, 9 + s.n, NOW() - INTERVAL (s.n * 2) MINUTE,
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

-- ---------------------------------------------------------------------------
-- 3. Ward assignment — drives the nurse dashboard's room / acuity columns and
--    the "assigned to me" flag (every patient is assigned to rn.nurse).
-- ---------------------------------------------------------------------------
INSERT INTO patient_care_assignment
    (pid, room, assigned_nurse_id, charge_nurse_id, acuity_level, acuity_score,
     updated_at, updated_by)
SELECT
    9 + s.n,
    CONCAT('ED-', 100 + s.n),
    @nurse, @charge,
    ELT(((s.n - 1) % 5) + 1, 'stat', 'stat', 'urgent', 'routine', 'routine'),
    105 - (((s.n - 1) % 5) + 1) * 15,
    NOW(), @chan
FROM ed_seq s
ON DUPLICATE KEY UPDATE
    room              = VALUES(room),
    assigned_nurse_id = VALUES(assigned_nurse_id),
    charge_nurse_id   = VALUES(charge_nurse_id),
    acuity_level      = VALUES(acuity_level),
    acuity_score      = VALUES(acuity_score),
    updated_at        = NOW(),
    updated_by        = VALUES(updated_by);


-- ---------------------------------------------------------------------------
-- 4. An active ED visit per patient (the board + provider dashboard)
-- ---------------------------------------------------------------------------
-- Levels cycle 1..5 so the department shows every triage colour and band.
DELETE FROM emergency_visits WHERE created_by = 'ed-load';

INSERT INTO emergency_visits
    (pid, patient_id, arrived_at, mode, chief_complaint, esi_level, color, label,
     triage_score, news2, shock_index, target_minutes, reassess_minutes, acuity,
     bypass, modifiers, reasons, needs_vitals, resources, vitals, vitals_source,
     status, room, provider_id, triaged_at, first_seen_at, created_by)
SELECT
    9 + e.n,
    (SELECT id FROM patient_data WHERE pid = 9 + e.n),
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
    @chan,
    NOW() - INTERVAL (e.n * 3 - 2) MINUTE,
    CASE WHEN ((e.n - 1) % 3) + 1 = 1 THEN NULL
         ELSE NOW() - INTERVAL (e.n * 3 - 8) MINUTE END,
    'ed-load'
FROM (SELECT s.n, ((s.n - 1) % 5) + 1 AS esi FROM ed_seq s) e;

DROP TEMPORARY TABLE IF EXISTS ed_seq;

