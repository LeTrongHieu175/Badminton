INSERT INTO users (username, full_name, phone, email, password_hash, role)
VALUES
  ('admin', 'Admin User', '0900000001', 'admin@smartbadminton.com', '$2b$10$tjIRskfjGFHUVQ/FzVdSReXe6NwOlzCgAjdVpf7Y0xVpG98UcwZ3a', 'admin'),
  ('john', 'John Player', '0900000002', 'john@example.com', '$2b$10$c7xOkL.9bxlDDUQFxyOWqOr2oer2hBziv6gqk4FLJHmenhF.DtDQC', 'user')
ON CONFLICT DO NOTHING;

WITH desired_courts (name, location, is_active) AS (
  VALUES
    ('Court A', 'Building 1 - Floor 2', TRUE),
    ('Court B', 'Building 1 - Floor 2', TRUE),
    ('Court C', 'Building 1 - Floor 3', TRUE),
    ('Court D', 'Building 1 - Floor 3', TRUE),
    ('Court E', 'Building 1 - Floor 4', TRUE),
    ('Court F', 'Building 1 - Floor 4', TRUE),
    ('Court G', 'Building 2 - Floor 2', TRUE),
    ('Court H', 'Building 2 - Floor 2', TRUE),
    ('Court I', 'Building 2 - Floor 3', TRUE),
    ('Court J', 'Building 2 - Floor 3', TRUE)
)
INSERT INTO courts (name, location, is_active, created_at, updated_at)
SELECT dc.name, dc.location, dc.is_active, NOW(), NOW()
FROM desired_courts dc
WHERE NOT EXISTS (
  SELECT 1
  FROM courts c
  WHERE c.name = dc.name
);

WITH desired_courts (name, location, is_active) AS (
  VALUES
    ('Court A', 'Building 1 - Floor 2', TRUE),
    ('Court B', 'Building 1 - Floor 2', TRUE),
    ('Court C', 'Building 1 - Floor 3', TRUE),
    ('Court D', 'Building 1 - Floor 3', TRUE),
    ('Court E', 'Building 1 - Floor 4', TRUE),
    ('Court F', 'Building 1 - Floor 4', TRUE),
    ('Court G', 'Building 2 - Floor 2', TRUE),
    ('Court H', 'Building 2 - Floor 2', TRUE),
    ('Court I', 'Building 2 - Floor 3', TRUE),
    ('Court J', 'Building 2 - Floor 3', TRUE)
)
UPDATE courts c
SET location = dc.location,
    is_active = dc.is_active,
    updated_at = NOW()
FROM desired_courts dc
WHERE c.name = dc.name;

WITH slot_templates (label, start_time, end_time, price_vnd) AS (
  VALUES
    ('Slot 01', '06:00'::time, '07:00'::time, 5000),
    ('Slot 02', '07:00'::time, '08:00'::time, 6000),
    ('Slot 03', '08:00'::time, '09:00'::time, 5000),
    ('Slot 04', '09:00'::time, '10:00'::time, 6000),
    ('Slot 05', '10:00'::time, '11:00'::time, 5000),
    ('Slot 06', '11:00'::time, '12:00'::time, 6000),
    ('Slot 07', '14:00'::time, '15:00'::time, 5000),
    ('Slot 08', '15:00'::time, '16:00'::time, 6000),
    ('Slot 09', '16:00'::time, '17:00'::time, 5000),
    ('Slot 10', '17:00'::time, '18:00'::time, 6000),
    ('Slot 11', '18:00'::time, '19:00'::time, 5000),
    ('Slot 12', '19:00'::time, '20:00'::time, 6000),
    ('Slot 13', '20:00'::time, '21:00'::time, 5000),
    ('Slot 14', '21:00'::time, '22:00'::time, 6000),
    ('Slot 15', '22:00'::time, '23:00'::time, 5000)
),
target_courts AS (
  SELECT c.id
  FROM courts c
  WHERE c.name IN ('Court A', 'Court B', 'Court C', 'Court D', 'Court E', 'Court F', 'Court G', 'Court H', 'Court I', 'Court J')
)
INSERT INTO court_slots (court_id, label, start_time, end_time, price_vnd, is_active, created_at)
SELECT tc.id, st.label, st.start_time, st.end_time, st.price_vnd, TRUE, NOW()
FROM target_courts tc
CROSS JOIN slot_templates st
ON CONFLICT (court_id, start_time, end_time) DO NOTHING;

WITH slot_templates (label, start_time, end_time, price_vnd) AS (
  VALUES
    ('Slot 01', '06:00'::time, '07:00'::time, 5000),
    ('Slot 02', '07:00'::time, '08:00'::time, 6000),
    ('Slot 03', '08:00'::time, '09:00'::time, 5000),
    ('Slot 04', '09:00'::time, '10:00'::time, 6000),
    ('Slot 05', '10:00'::time, '11:00'::time, 5000),
    ('Slot 06', '11:00'::time, '12:00'::time, 6000),
    ('Slot 07', '14:00'::time, '15:00'::time, 5000),
    ('Slot 08', '15:00'::time, '16:00'::time, 6000),
    ('Slot 09', '16:00'::time, '17:00'::time, 5000),
    ('Slot 10', '17:00'::time, '18:00'::time, 6000),
    ('Slot 11', '18:00'::time, '19:00'::time, 5000),
    ('Slot 12', '19:00'::time, '20:00'::time, 6000),
    ('Slot 13', '20:00'::time, '21:00'::time, 5000),
    ('Slot 14', '21:00'::time, '22:00'::time, 6000),
    ('Slot 15', '22:00'::time, '23:00'::time, 5000)
)
UPDATE court_slots cs
SET label = st.label,
    price_vnd = st.price_vnd,
    is_active = TRUE
FROM slot_templates st
WHERE cs.start_time = st.start_time
  AND cs.end_time = st.end_time
  AND cs.court_id IN (
    SELECT c.id
    FROM courts c
    WHERE c.name IN ('Court A', 'Court B', 'Court C', 'Court D', 'Court E', 'Court F', 'Court G', 'Court H', 'Court I', 'Court J')
  );
