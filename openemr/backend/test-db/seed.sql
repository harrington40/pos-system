-- ---------------------------------------------------------------------------
-- OpenRx synthetic seed data
-- ---------------------------------------------------------------------------
-- Everything below is INVENTED. No production rows are copied, which is the
-- whole point: the test database must never contain real patient information.
--
-- It provides just enough baseline for the backend to boot cleanly and for the
-- authenticated API tests to have something to read, plus a small demo workload
-- for the dashboards (see demo-seed.sql for the matching emergency visits):
--
--   * eight staff accounts (administrator, physicians, nurses)
--   * nine patients, including one with a portal credential
--   * six demo emergency patients registered to Dr. Chan, with charted vitals
--   * one appointment
--
-- Credentials (test-only, safe to publish):
--   admin    / OpenRxTest123
--   dr.test  / OpenRxTest123
--   dr.chan  / OpenRxTest123   (demo ED clinician)
--   rn.nurse / OpenRxTest123   (demo nurse)
--   rn.charge/ OpenRxTest123   (demo registered nurse)
--
-- Re-running this file is safe: every insert is keyed and uses INSERT ...
-- ON DUPLICATE KEY UPDATE or a fixed primary key.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Staff accounts
-- ---------------------------------------------------------------------------
-- Every account is inserted BY USERNAME, never by id. `users.id` is
-- AUTO_INCREMENT and may already hold rows the application created
-- (inventory.manager, for one), so supplying an id made ON DUPLICATE KEY UPDATE
-- silently overwrite an unrelated account — and left users_secure attached to
-- the wrong username. `username` has no unique index either, hence the explicit
-- NOT EXISTS guard that keeps this file re-runnable.
--
-- OpenEMR stores uuids as binary(16), hence the hex decode.
--
-- Password for all accounts is OpenRxTest123 (bcrypt, cost 10). Test-only.
--   admin          approved administrator
--   dr.test        approved physician
--   pending.user   awaiting approval   | these three must NOT be able to log in,
--   rejected.user  registration refused| and the authentication tests assert
--   inactive.user  approved, disabled  | exactly that
--   dr.chan        approved physician  | demo clinicians that carry the emergency
--   rn.nurse       approved nurse      | workload seeded below and in demo-seed.sql
--   rn.charge      approved registered nurse
INSERT INTO users (uuid, username, fname, lname, title, specialty, active,
                   authorized, main_menu_role, calendar_color,
                   registration_status, can_edit_providers, can_view_charts,
                   can_edit_charges)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000001', '-', '')),
       'admin', 'Ada', 'Administrator', 'System Administrator', 'Administrative',
       1, 1, 'admin', '#0d6efd', 'approved', 1, 1, 1
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'admin');

INSERT INTO users (uuid, username, fname, lname, title, specialty, active,
                   authorized, main_menu_role, calendar_color,
                   registration_status, can_edit_providers, can_view_charts,
                   can_edit_charges)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000002', '-', '')),
       'dr.test', 'Dana', 'Test', 'MD', 'Family Medicine',
       1, 1, 'physician', '#198754', 'approved', 0, 1, 0
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'dr.test');

INSERT INTO users (uuid, username, fname, lname, active, authorized,
                   main_menu_role, registration_status)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000003', '-', '')),
       'pending.user', 'Pat', 'Pending', 0, 0, 'standard', 'pending'
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'pending.user');

INSERT INTO users (uuid, username, fname, lname, active, authorized,
                   main_menu_role, registration_status)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000004', '-', '')),
       'rejected.user', 'Rita', 'Rejected', 0, 0, 'standard', 'rejected'
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'rejected.user');

INSERT INTO users (uuid, username, fname, lname, active, authorized,
                   main_menu_role, registration_status)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000005', '-', '')),
       'inactive.user', 'Ivan', 'Inactive', 0, 0, 'standard', 'approved'
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'inactive.user');

-- ---------------------------------------------------------------------------
-- Demo clinicians
-- ---------------------------------------------------------------------------
-- Dr. Chan is the emergency physician the demo patients are registered to, so
-- they appear on his provider dashboard. The two nurses staff the ward; the
-- frontend routes `nurse` to the aide dashboard and `registered_nurse` to the RN
-- dashboard, both of which read /nurse/dashboard. `rn.nurse` is also picked up
-- by the smart-routing nurse-assignment query (`main_menu_role IN
-- ('nurse','registered_nurse')`), so assignments resolve to a real person.
INSERT INTO users (uuid, username, fname, lname, title, specialty, active,
                   authorized, main_menu_role, registration_status,
                   calendar_color, can_view_charts)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000006', '-', '')),
       'dr.chan', 'Wei', 'Chan', 'MD', 'Emergency Medicine',
       1, 1, 'physician', 'approved', '#6f42c1', 1
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'dr.chan');

INSERT INTO users (uuid, username, fname, lname, title, specialty, active,
                   authorized, main_menu_role, registration_status,
                   calendar_color, can_view_charts)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000007', '-', '')),
       'rn.nurse', 'Nadia', 'Nightingale', 'RN', 'Nursing',
       1, 1, 'nurse', 'approved', '#0dcaf0', 1
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'rn.nurse');

INSERT INTO users (uuid, username, fname, lname, title, specialty, active,
                   authorized, main_menu_role, registration_status,
                   calendar_color, can_view_charts)
SELECT UNHEX(REPLACE('10000000-0000-0000-0000-000000000008', '-', '')),
       'rn.charge', 'Florence', 'Ward', 'RN', 'Nursing',
       1, 1, 'registered_nurse', 'approved', '#20c997', 1
FROM (SELECT 1) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users WHERE BINARY username = 'rn.charge');

-- users_secure keys on the same id, so resolve it from the username rather than
-- assuming one.
INSERT INTO users_secure (id, username, password)
SELECT id, username,
       '$2b$10$Mm8e/7WUxhNWBXuSb70VF.Rfm3J6RFepf4dXMMiqQkH4PCI5Lc4CS'
FROM users
WHERE BINARY username IN
      ('admin', 'dr.test', 'pending.user', 'rejected.user', 'inactive.user',
       'dr.chan', 'rn.nurse', 'rn.charge')
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
INSERT INTO patient_data (pid, pubpid, fname, lname, mname, DOB, sex,
                          street, city, state, postal_code, phone_home,
                          email, public_id, insurance_type,
                          patient_responsibility_percent, approved_at)
VALUES
    (1, 'RX-TEST-00001', 'Pia',   'Patient',   'Q', '1985-03-14', 'Female',
     '1 Synthetic Way', 'Testville', 'TS', '00001', '555-0100',
     'pia.patient@example.test',   'RX-2608-T0001', 'insured',   20, NOW()),
    (2, 'RX-TEST-00002', 'Patel', 'Sample',    'R', '1972-11-02', 'Male',
     '2 Synthetic Way', 'Testville', 'TS', '00001', '555-0101',
     'patel.sample@example.test',  'RX-2608-T0002', 'self_pay', 100, NOW()),
    (3, 'RX-TEST-00003', 'Robin', 'Placeholder','S', '1994-07-21', 'Other',
     '3 Synthetic Way', 'Testville', 'TS', '00001', '555-0102',
     'robin.placeholder@example.test', 'RX-2608-T0003', 'self_pay', 100, NOW())
ON DUPLICATE KEY UPDATE
    fname = VALUES(fname),
    lname = VALUES(lname),
    public_id = VALUES(public_id);

-- ---------------------------------------------------------------------------
-- A scheduled appointment (provider 2, patient 1)
-- ---------------------------------------------------------------------------
INSERT INTO openemr_postcalendar_events
    (pc_eid, pc_catid, pc_multiple, pc_aid, pc_pid, pc_title,
     pc_eventDate, pc_startTime, pc_duration, pc_apptstatus, pc_time)
VALUES
    (1, 5, 0, 2, 1, 'Synthetic follow-up visit',
     DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', 900, '-', NOW())
ON DUPLICATE KEY UPDATE
    pc_pid = VALUES(pc_pid),
    pc_eventDate = VALUES(pc_eventDate);

-- ---------------------------------------------------------------------------
-- Demo emergency patients (attached to Dr. Chan)
-- ---------------------------------------------------------------------------
-- Six extra patients, `active` so the nurse dashboards list them, registered to
-- Dr. Chan (set below) so his provider dashboard carries them. `pid` is a fixed
-- key with ON DUPLICATE KEY UPDATE, so re-running this file does not duplicate
-- them. Their department visits live in demo-seed.sql (the emergency_visits
-- table only exists after the backend has booted once).
INSERT INTO patient_data (pid, pubpid, fname, lname, mname, DOB, sex,
                          street, city, state, postal_code,
                          phone_home, phone_contact, email,
                          public_id, insurance_type,
                          patient_responsibility_percent, approved_at,
                          status, regdate)
VALUES
    (4, 'RX-TEST-00004', 'Amara',  'Johnson',   'L', '1958-02-11', 'Female',
     '4 Synthetic Way', 'Testville', 'TS', '00001',
     '555-0104', '555-0204', 'amara.johnson@example.test',
     'RX-2608-T0004', 'insured', 20, NOW(), 'active', NOW()),
    (5, 'RX-TEST-00005', 'Liam',   'Okafor',    'T', '1991-09-30', 'Male',
     '5 Synthetic Way', 'Testville', 'TS', '00001',
     '555-0105', '555-0205', 'liam.okafor@example.test',
     'RX-2608-T0005', 'self_pay', 100, NOW(), 'active', NOW()),
    (6, 'RX-TEST-00006', 'Sofia',  'Martinez',  'P', '2016-04-18', 'Female',
     '6 Synthetic Way', 'Testville', 'TS', '00001',
     '555-0106', '555-0206', 'sofia.martinez@example.test',
     'RX-2608-T0006', 'insured', 20, NOW(), 'active', NOW()),
    (7, 'RX-TEST-00007', 'David',  'Mensah',    'K', '1946-12-05', 'Male',
     '7 Synthetic Way', 'Testville', 'TS', '00001',
     '555-0107', '555-0207', 'david.mensah@example.test',
     'RX-2608-T0007', 'insured', 20, NOW(), 'active', NOW()),
    (8, 'RX-TEST-00008', 'Chloe',  'Adeyemi',   'N', '2001-06-22', 'Female',
     '8 Synthetic Way', 'Testville', 'TS', '00001',
     '555-0108', '555-0208', 'chloe.adeyemi@example.test',
     'RX-2608-T0008', 'self_pay', 100, NOW(), 'active', NOW()),
    (9, 'RX-TEST-00009', 'Marcus', 'Reeves',    'J', '1979-03-03', 'Male',
     '9 Synthetic Way', 'Testville', 'TS', '00001',
     '555-0109', '555-0209', 'marcus.reeves@example.test',
     'RX-2608-T0009', 'self_pay', 100, NOW(), 'active', NOW())
ON DUPLICATE KEY UPDATE
    fname = VALUES(fname),
    lname = VALUES(lname),
    public_id = VALUES(public_id),
    status = VALUES(status);

-- Register the demo patients to Dr. Chan (resolved by username, never by id).
UPDATE patient_data
   SET providerID = (SELECT id FROM users WHERE BINARY username = 'dr.chan'),
       provider_since_date = COALESCE(regdate, NOW())
 WHERE pid BETWEEN 4 AND 9;

-- ---------------------------------------------------------------------------
-- Demo vitals for the nurse + provider dashboards
-- ---------------------------------------------------------------------------
-- Two charted sets per patient so the dashboards show a trend, not a single
-- point. Fixed primary keys keep this re-runnable; `recordVitals()` in the
-- emergency service writes the same column set without an explicit id, so this
-- matches what the app itself produces.
INSERT INTO form_vitals (id, pid, date, bps, bpd, pulse, respiration,
                         temperature, oxygen_saturation, weight, height, BMI,
                         note, activity, authorized)
VALUES
    -- Amara Johnson — hypertensive, chest pain (deteriorating → improving)
    (9001, 4, NOW() - INTERVAL 8 HOUR, 168, 98, 126, 24, 37.1, 91, 82, 162, 31.2, 'Triage vitals', 1, 1),
    (9002, 4, NOW() - INTERVAL 1 HOUR, 152, 94, 118, 22, 37.2, 94, 82, 162, 31.2, 'Reassessment', 1, 1),
    -- Liam Okafor — road traffic accident, stable
    (9003, 5, NOW() - INTERVAL 6 HOUR, 118, 76, 102, 20, 36.8, 96, 78, 180, 24.1, 'Triage vitals', 1, 1),
    (9004, 5, NOW() - INTERVAL 30 MINUTE, 110, 70, 96, 18, 36.7, 97, 78, 180, 24.1, 'Reassessment', 1, 1),
    -- Sofia Martinez — febrile child, improving
    (9005, 6, NOW() - INTERVAL 5 HOUR, 118, 74, 140, 28, 39.2, 95, 22, 115, 16.6, 'Triage vitals', 1, 1),
    (9006, 6, NOW() - INTERVAL 45 MINUTE, 112, 70, 128, 24, 38.4, 97, 22, 115, 16.6, 'Antipyretic given', 1, 1),
    -- David Mensah — breathless, needing oxygen
    (9007, 7, NOW() - INTERVAL 7 HOUR, 138, 84, 92, 26, 37.0, 90, 70, 172, 23.7, 'Triage vitals', 1, 1),
    (9008, 7, NOW() - INTERVAL 1 HOUR, 132, 80, 88, 24, 37.1, 92, 70, 172, 23.7, 'On 2L nasal O2', 1, 1),
    -- Chloe Adeyemi — abdominal pain, stable
    (9009, 8, NOW() - INTERVAL 4 HOUR, 104, 68, 88, 18, 36.9, 99, 61, 165, 22.4, 'Triage vitals', 1, 1),
    (9010, 8, NOW() - INTERVAL 50 MINUTE, 100, 64, 84, 18, 36.8, 99, 61, 165, 22.4, 'Reassessment', 1, 1),
    -- Marcus Reeves — laceration, well
    (9011, 9, NOW() - INTERVAL 3 HOUR, 126, 78, 80, 16, 36.6, 98, 88, 178, 27.8, 'Triage vitals', 1, 1)
ON DUPLICATE KEY UPDATE
    date = VALUES(date),
    bps = VALUES(bps),
    bpd = VALUES(bpd),
    pulse = VALUES(pulse),
    respiration = VALUES(respiration),
    temperature = VALUES(temperature),
    oxygen_saturation = VALUES(oxygen_saturation),
    weight = VALUES(weight),
    height = VALUES(height),
    BMI = VALUES(BMI),
    note = VALUES(note);
