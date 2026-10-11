-- ---------------------------------------------------------------------------
-- OpenRx demo emergency workload (run AFTER the backend has booted once)
-- ---------------------------------------------------------------------------
-- These rows land in tables the *backend* creates at runtime via
-- `CREATE TABLE IF NOT EXISTS`:
--
--   * emergency_visits            (emergency.service.ts → getBoard / provider dashboard)
--   * emergency_reassessments     (the reassessment trail)
--   * patient_care_assignment     (nursing.service.ts → /nurse/dashboard)
--
-- `seed.sql` runs before the backend exists, so it cannot touch them; run this
-- file once the app is up (see seed-demo.sh). Everything here is synthetic.
--
-- Safe to re-run: the demo visits carry the marker `created_by = 'demo-seed'`
-- and are deleted first, and the care assignments upsert on the `pid` key.
-- ---------------------------------------------------------------------------

SET @chan   := (SELECT id FROM users WHERE BINARY username = 'dr.chan');
SET @nurse  := (SELECT id FROM users WHERE BINARY username = 'rn.nurse');
SET @charge := (SELECT id FROM users WHERE BINARY username = 'rn.charge');

-- ---------------------------------------------------------------------------
-- Ward assignments (drives the nurse dashboard's room / acuity / "assigned to me")
-- ---------------------------------------------------------------------------
INSERT INTO patient_care_assignment
    (pid, room, assigned_nurse_id, charge_nurse_id, acuity_level, acuity_score,
     updated_at, updated_by)
VALUES
    (4, 'Resus-1', @nurse, @charge, 'stat',    95, NOW(), @chan),
    (5, 'Resus-2', @nurse, @charge, 'stat',    90, NOW(), @chan),
    (6, 'ED-3',    @nurse, @charge, 'stat',    80, NOW(), @chan),
    (7, 'ED-4',    @nurse, @charge, 'urgent',  55, NOW(), @chan),
    (8, 'ED-5',    @nurse, @charge, 'urgent',  45, NOW(), @chan),
    (9, 'ED-6',    @nurse, @charge, 'routine', 15, NOW(), @chan)
ON DUPLICATE KEY UPDATE
    room              = VALUES(room),
    assigned_nurse_id = VALUES(assigned_nurse_id),
    charge_nurse_id   = VALUES(charge_nurse_id),
    acuity_level      = VALUES(acuity_level),
    acuity_score      = VALUES(acuity_score),
    updated_at        = NOW(),
    updated_by        = VALUES(updated_by);

-- ---------------------------------------------------------------------------
-- Active department visits, one per demo patient, across the triage spectrum
-- ---------------------------------------------------------------------------
-- Colours/labels mirror TRIAGE_LEVELS (1 red … 5 blue). `provider_id` is Dr. Chan
-- so these surface on his provider dashboard via getActiveVisitsForProvider().
-- `vitals` matches the latest form_vitals row seeded in seed.sql.
DELETE FROM emergency_reassessments
 WHERE visit_id IN (SELECT id FROM emergency_visits WHERE created_by = 'demo-seed');
DELETE FROM emergency_visits WHERE created_by = 'demo-seed';

INSERT INTO emergency_visits
    (pid, patient_id, arrived_at, mode, chief_complaint, esi_level, color, label,
     triage_score, news2, shock_index, target_minutes, reassess_minutes, acuity,
     bypass, modifiers, reasons, needs_vitals, resources, vitals, vitals_source,
     status, room, provider_id, triaged_at, first_seen_at, created_by)
VALUES
    -- Amara Johnson — ischaemic-sounding chest pain, in resus
    (4, (SELECT id FROM patient_data WHERE pid = 4),
     NOW() - INTERVAL 120 MINUTE, 'walk-in', 'Central chest pain, radiating to jaw',
     2, '#fd7e14', 'Orange', 70, 6, 0.78, 10, 15, 'stat',
     '["chest-pain"]', '[]', '["ischaemic ECG changes", "tachycardia"]', 0, 3,
     '{"bps":152,"bpd":94,"pulse":118,"respiration":22,"temperature":37.2,"oxygen_saturation":94}',
     'chart', 'in_treatment', 'Resus-1', @chan,
     NOW() - INTERVAL 115 MINUTE, NOW() - INTERVAL 100 MINUTE, 'demo-seed'),
    -- Liam Okafor — motorcycle collision, primary survey in progress
    (5, (SELECT id FROM patient_data WHERE pid = 5),
     NOW() - INTERVAL 95 MINUTE, 'ambulance', 'Motorcycle collision, pelvic pain',
     1, '#dc3545', 'Red', 90, 4, 0.85, 0, 0, 'stat',
     '["trauma"]', '["trauma-alert"]', '["major trauma", "hypotension risk"]', 0, 4,
     '{"bps":110,"bpd":70,"pulse":96,"respiration":18,"temperature":36.7,"oxygen_saturation":97}',
     'triage', 'in_treatment', 'Resus-2', @chan,
     NOW() - INTERVAL 90 MINUTE, NOW() - INTERVAL 88 MINUTE, 'demo-seed'),
    -- Sofia Martinez — febrile child, awaiting paediatrics
    (6, (SELECT id FROM patient_data WHERE pid = 6),
     NOW() - INTERVAL 40 MINUTE, 'walk-in', 'Fever and a brief seizure at home',
     2, '#fd7e14', 'Orange', 65, 5, NULL, 10, 15, 'stat',
     '["paediatric"]', '[]', '["febrile convulsion", "age < 5"]', 1, 2,
     '{"bps":112,"bpd":70,"pulse":128,"respiration":24,"temperature":38.4,"oxygen_saturation":97}',
     'triage', 'waiting', 'ED-3', @chan,
     NOW() - INTERVAL 35 MINUTE, NULL, 'demo-seed'),
    -- David Mensah — breathless, on oxygen
    (7, (SELECT id FROM patient_data WHERE pid = 7),
     NOW() - INTERVAL 70 MINUTE, 'walk-in', 'Shortness of breath, productive cough',
     3, '#ffc107', 'Yellow', 45, 5, NULL, 30, 30, 'urgent',
     '["respiratory"]', '[]', '["low SpO2", "tachypnoea"]', 0, 2,
     '{"bps":132,"bpd":80,"pulse":88,"respiration":24,"temperature":37.1,"oxygen_saturation":92}',
     'chart', 'waiting', 'ED-4', @chan,
     NOW() - INTERVAL 65 MINUTE, NULL, 'demo-seed'),
    -- Chloe Adeyemi — abdominal pain, being observed
    (8, (SELECT id FROM patient_data WHERE pid = 8),
     NOW() - INTERVAL 150 MINUTE, 'walk-in', 'Right lower abdominal pain, nausea',
     3, '#ffc107', 'Yellow', 40, 1, NULL, 30, 30, 'urgent',
     '["abdominal"]', '["pregnancy-status"]', '[]', 0, 3,
     '{"bps":100,"bpd":64,"pulse":84,"respiration":18,"temperature":36.8,"oxygen_saturation":99}',
     'chart', 'observation', 'ED-5', @chan,
     NOW() - INTERVAL 145 MINUTE, NOW() - INTERVAL 120 MINUTE, 'demo-seed'),
    -- Marcus Reeves — simple laceration, minor stream
    (9, (SELECT id FROM patient_data WHERE pid = 9),
     NOW() - INTERVAL 25 MINUTE, 'walk-in', 'Forearm laceration after a fall',
     4, '#198754', 'Green', 20, 0, NULL, 60, 60, 'routine',
     '["minor"]', '[]', '[]', 0, 1,
     '{"bps":126,"bpd":78,"pulse":80,"respiration":16,"temperature":36.6,"oxygen_saturation":98}',
     'triage', 'waiting', 'ED-6', @chan,
     NOW() - INTERVAL 22 MINUTE, NULL, 'demo-seed');

-- ---------------------------------------------------------------------------
-- Reassessment trail for two patients — it feeds the chart banner and sets the
-- "has just been observed" clock so their reassessment is not immediately overdue
-- ---------------------------------------------------------------------------
INSERT INTO emergency_reassessments
    (visit_id, at, level_before, level_after, news2, vitals, reasons, note, kind, recorded_by)
SELECT v.id, NOW() - INTERVAL 1 HOUR, 2, 2, 6,
       '{"bps":152,"bpd":94,"pulse":118,"respiration":22,"temperature":37.2,"oxygen_saturation":94}',
       '[]', 'Reassessed: pain settling, awaiting troponin', 'observation', 'Nadia Nightingale'
  FROM emergency_visits v
 WHERE v.created_by = 'demo-seed' AND v.pid = 4;

INSERT INTO emergency_reassessments
    (visit_id, at, level_before, level_after, news2, vitals, reasons, note, kind, recorded_by)
SELECT v.id, NOW() - INTERVAL 1 HOUR, 3, 3, 5,
       '{"bps":132,"bpd":80,"pulse":88,"respiration":24,"temperature":37.1,"oxygen_saturation":92}',
       '[]', 'Reassessed: saturations 92% on 2L O2', 'observation', 'Nadia Nightingale'
  FROM emergency_visits v
 WHERE v.created_by = 'demo-seed' AND v.pid = 7;

