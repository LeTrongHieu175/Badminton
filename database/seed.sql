BEGIN;

TRUNCATE TABLE
  reviews,
  payments,
  bookings,
  time_slots,
  courts,
  users
RESTART IDENTITY CASCADE;

-- 10 users
INSERT INTO users (name, email, password, role, created_at)
VALUES
  ('Admin One', 'admin1@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'ADMIN', NOW() - INTERVAL '300 days'),
  ('Player One', 'player1@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '270 days'),
  ('Player Two', 'player2@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '250 days'),
  ('Player Three', 'player3@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '220 days'),
  ('Player Four', 'player4@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '200 days'),
  ('Player Five', 'player5@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '180 days'),
  ('Player Six', 'player6@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '160 days'),
  ('Player Seven', 'player7@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '130 days'),
  ('Player Eight', 'player8@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '100 days'),
  ('Player Nine', 'player9@smartbadminton.local', '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG', 'USER', NOW() - INTERVAL '80 days');

-- 5 courts
INSERT INTO courts (name, location, price_per_hour, status)
VALUES
  ('Court A', 'District 1 - Main Hall', 12.00, 'ACTIVE'),
  ('Court B', 'District 1 - Main Hall', 12.00, 'ACTIVE'),
  ('Court C', 'District 3 - Community Center', 14.00, 'ACTIVE'),
  ('Court D', 'District 7 - Riverside Sports', 15.50, 'MAINTENANCE'),
  ('Court E', 'Thu Duc - University Arena', 13.50, 'ACTIVE');

-- Daily slots from 06:00 -> 22:00 (16 one-hour slots per court)
INSERT INTO time_slots (court_id, start_time, end_time)
SELECT
  c.id,
  (TIME '06:00' + (g.slot_no * INTERVAL '1 hour'))::time AS start_time,
  (TIME '07:00' + (g.slot_no * INTERVAL '1 hour'))::time AS end_time
FROM courts c
CROSS JOIN generate_series(0, 15) AS g(slot_no)
ORDER BY c.id, start_time;

/*
  10,000 booking records across diverse dates and slots.
  Date span: 2024-01-01 -> 2026-12-31 (multi-year history for analytics/AI training).
*/
WITH booking_candidates AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY d.booking_date, ts.court_id, ts.id) AS seq,
    ((ABS(hashtext(d.booking_date::text || '-' || ts.id::text)) % 10) + 1)::BIGINT AS user_id,
    ts.court_id,
    ts.id AS slot_id,
    d.booking_date,
    ts.start_time
  FROM generate_series(DATE '2024-01-01', DATE '2026-12-31', INTERVAL '1 day') AS d(booking_date)
  CROSS JOIN time_slots ts
),
selected_bookings AS (
  SELECT *
  FROM booking_candidates
  ORDER BY md5(seq::text)
  LIMIT 10000
)
INSERT INTO bookings (
  user_id,
  court_id,
  slot_id,
  booking_date,
  status,
  payment_status,
  created_at
)
SELECT
  sb.user_id,
  sb.court_id,
  sb.slot_id,
  sb.booking_date,
  CASE
    WHEN sb.seq % 100 < 65 THEN 'CONFIRMED'
    WHEN sb.seq % 100 < 82 THEN 'COMPLETED'
    WHEN sb.seq % 100 < 94 THEN 'CANCELLED'
    ELSE 'PENDING'
  END AS status,
  CASE
    WHEN sb.seq % 100 < 74 THEN 'PAID'
    WHEN sb.seq % 100 < 87 THEN 'UNPAID'
    WHEN sb.seq % 100 < 95 THEN 'FAILED'
    ELSE 'REFUNDED'
  END AS payment_status,
  (
    sb.booking_date::timestamp
    + sb.start_time
    - INTERVAL '1 day'
    + ((sb.seq % 12) || ' hour')::interval
  ) AS created_at
FROM selected_bookings sb;

-- 1:1 payment record per booking
INSERT INTO payments (booking_id, amount, method, transaction_id, status)
SELECT
  b.id AS booking_id,
  c.price_per_hour AS amount,
  CASE
    WHEN b.id % 4 = 0 THEN 'CARD'
    WHEN b.id % 4 = 1 THEN 'E_WALLET'
    WHEN b.id % 4 = 2 THEN 'BANK_TRANSFER'
    ELSE 'CASH'
  END AS method,
  'TXN-' || LPAD(b.id::text, 8, '0') AS transaction_id,
  CASE b.payment_status
    WHEN 'PAID' THEN 'SUCCESS'
    WHEN 'FAILED' THEN 'FAILED'
    WHEN 'REFUNDED' THEN 'REFUNDED'
    ELSE 'PENDING'
  END AS status
FROM bookings b
JOIN courts c ON c.id = b.court_id;

-- Reviews sampled from confirmed/completed history
INSERT INTO reviews (user_id, court_id, rating, comment)
SELECT
  x.user_id,
  x.court_id,
  CASE
    WHEN x.rn % 10 IN (0, 1) THEN 5
    WHEN x.rn % 10 IN (2, 3, 4) THEN 4
    WHEN x.rn % 10 IN (5, 6, 7) THEN 3
    WHEN x.rn % 10 = 8 THEN 2
    ELSE 1
  END AS rating,
  CASE x.rn % 6
    WHEN 0 THEN 'Great court quality and lighting.'
    WHEN 1 THEN 'Good value and easy booking process.'
    WHEN 2 THEN 'Floor grip is decent, overall satisfied.'
    WHEN 3 THEN 'Busy hours can be crowded but manageable.'
    WHEN 4 THEN 'Service is okay, could improve ventilation.'
    ELSE 'Average experience, acceptable for training.'
  END AS comment
FROM (
  SELECT
    b.user_id,
    b.court_id,
    ROW_NUMBER() OVER (PARTITION BY b.user_id, b.court_id ORDER BY b.booking_date DESC) AS rn
  FROM bookings b
  WHERE b.status IN ('CONFIRMED', 'COMPLETED')
) x
WHERE x.rn = 1
LIMIT 500;

COMMIT;
