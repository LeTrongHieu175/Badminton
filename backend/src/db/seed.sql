INSERT INTO users (username, full_name, phone, email, password_hash, role)
VALUES
  ('admin', 'Admin User', '0900000001', 'admin@smartbadminton.com', '$2b$10$tjIRskfjGFHUVQ/FzVdSReXe6NwOlzCgAjdVpf7Y0xVpG98UcwZ3a', 'admin'),
  ('john', 'John Player', '0900000002', 'john@example.com', '$2b$10$c7xOkL.9bxlDDUQFxyOWqOr2oer2hBziv6gqk4FLJHmenhF.DtDQC', 'user')
ON CONFLICT DO NOTHING;

INSERT INTO courts (name, location, is_active)
VALUES
  ('Court A', 'Building 1 - Floor 2', TRUE),
  ('Court B', 'Building 1 - Floor 2', TRUE)
ON CONFLICT DO NOTHING;

WITH all_courts AS (
  SELECT id FROM courts WHERE is_active = TRUE
)
INSERT INTO court_slots (court_id, label, start_time, end_time, price_cents)
SELECT c.id, 'Morning 1', '06:00', '07:00', 1200 FROM all_courts c
ON CONFLICT DO NOTHING;

WITH all_courts AS (
  SELECT id FROM courts WHERE is_active = TRUE
)
INSERT INTO court_slots (court_id, label, start_time, end_time, price_cents)
SELECT c.id, 'Morning 2', '07:00', '08:00', 1200 FROM all_courts c
ON CONFLICT DO NOTHING;

WITH all_courts AS (
  SELECT id FROM courts WHERE is_active = TRUE
)
INSERT INTO court_slots (court_id, label, start_time, end_time, price_cents)
SELECT c.id, 'Evening Prime', '18:00', '19:00', 1800 FROM all_courts c
ON CONFLICT DO NOTHING;

WITH all_courts AS (
  SELECT id FROM courts WHERE is_active = TRUE
)
INSERT INTO court_slots (court_id, label, start_time, end_time, price_cents)
SELECT c.id, 'Evening Prime 2', '19:00', '20:00', 1800 FROM all_courts c
ON CONFLICT DO NOTHING;
