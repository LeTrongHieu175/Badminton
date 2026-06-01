-- Seed a more realistic one-year operating history for demo environments.
-- Creates a broad user base, past and upcoming bookings, and payment records
-- so admin/user dashboards look like a system that has been running for months.

WITH
last_name(last_name) AS (
  VALUES
    ('Nguyen'),
    ('Tran'),
    ('Le'),
    ('Pham'),
    ('Hoang'),
    ('Huynh'),
    ('Phan'),
    ('Vu'),
    ('Dang'),
    ('Bui'),
    ('Do'),
    ('Ngo')
),
middle_name(middle_name) AS (
  VALUES
    ('Van'),
    ('Thi'),
    ('Minh'),
    ('Quang'),
    ('Thanh'),
    ('Ngoc'),
    ('Duc'),
    ('Gia'),
    ('Bao')
),
first_name(first_name) AS (
  VALUES
    ('An'),
    ('Anh'),
    ('Bao'),
    ('Binh'),
    ('Chau'),
    ('Dat'),
    ('Duy'),
    ('Giang'),
    ('Ha'),
    ('Hai'),
    ('Hieu'),
    ('Hoa'),
    ('Hung'),
    ('Khanh'),
    ('Lam'),
    ('Lan'),
    ('Linh'),
    ('Long'),
    ('Mai'),
    ('Nam'),
    ('Nga'),
    ('Ngan'),
    ('Ngoc'),
    ('Nhi'),
    ('Phat'),
    ('Phuoc'),
    ('Phuong'),
    ('Quan'),
    ('Quynh'),
    ('Son'),
    ('Tam'),
    ('Thao'),
    ('Thien'),
    ('Trang'),
    ('Trinh'),
    ('Tuan'),
    ('Tuyet'),
    ('Viet'),
    ('Vy'),
    ('Yen')
),
generated_names AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY l.last_name, m.middle_name, f.first_name) AS idx,
    TRIM(l.last_name || ' ' || m.middle_name || ' ' || f.first_name) AS full_name
  FROM last_name l
  CROSS JOIN middle_name m
  CROSS JOIN first_name f
),
target_names AS (
  SELECT idx, full_name
  FROM generated_names
  ORDER BY idx
  LIMIT 240
),
insert_users AS (
  INSERT INTO users (
    username,
    full_name,
    phone,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
  )
  SELECT
    'player_' || LPAD(idx::text, 3, '0') AS username,
    full_name,
    '09' || LPAD((10000000 + idx)::text, 8, '0') AS phone,
    'ops.demo.' || idx || '@example.com' AS email,
    '$2b$10$c7xOkL.9bxlDDUQFxyOWqOr2oer2hBziv6gqk4FLJHmenhF.DtDQC',
    'user',
    CASE WHEN idx % 19 = 0 THEN FALSE ELSE TRUE END,
    NOW() - ((450 - (idx % 360))::text || ' days')::interval,
    NOW() - ((idx % 45)::text || ' days')::interval
  FROM target_names
  ON CONFLICT DO NOTHING
  RETURNING id
),
slot_pool AS (
  SELECT
    cs.id AS slot_id,
    cs.court_id,
    cs.price_vnd,
    cs.start_time,
    cs.end_time,
    ROW_NUMBER() OVER (ORDER BY cs.court_id, cs.start_time, cs.id) AS slot_idx
  FROM court_slots cs
  JOIN courts c ON c.id = cs.court_id
  WHERE c.is_active = TRUE
    AND cs.is_active = TRUE
),
slot_count AS (
  SELECT COUNT(*)::int AS cnt
  FROM slot_pool
),
user_pool AS (
  SELECT
    u.id AS user_id,
    ROW_NUMBER() OVER (ORDER BY u.created_at, u.id) AS user_idx
  FROM users u
  WHERE u.role = 'user'
),
user_count AS (
  SELECT COUNT(*)::int AS cnt
  FROM user_pool
),
date_series AS (
  SELECT generate_series(CURRENT_DATE - 364, CURRENT_DATE + 21, interval '1 day')::date AS booking_date
),
candidate_slots AS (
  SELECT
    ds.booking_date,
    sp.slot_id,
    sp.court_id,
    sp.price_vnd,
    sp.start_time,
    sp.end_time,
    EXTRACT(ISODOW FROM ds.booking_date)::int AS iso_dow,
    EXTRACT(MONTH FROM ds.booking_date)::int AS month_no,
    EXTRACT(HOUR FROM sp.start_time)::int AS start_hour
  FROM date_series ds
  CROSS JOIN slot_pool sp
),
selected_slots AS (
  SELECT *
  FROM candidate_slots
  WHERE random() <
    LEAST(
      CASE
        WHEN booking_date > CURRENT_DATE THEN
          CASE
            WHEN start_hour BETWEEN 17 AND 20 THEN 0.34
            WHEN start_hour IN (7, 8, 16, 21) THEN 0.24
            WHEN start_hour IN (6, 9, 14, 15) THEN 0.15
            ELSE 0.08
          END
        ELSE
          CASE
            WHEN start_hour BETWEEN 18 AND 20 THEN 0.58
            WHEN start_hour IN (17, 21) THEN 0.42
            WHEN start_hour IN (7, 8, 16) THEN 0.31
            WHEN start_hour IN (6, 9, 14, 15) THEN 0.21
            ELSE 0.10
          END
      END
      + CASE WHEN iso_dow IN (6, 7) THEN 0.12 ELSE 0 END
      + CASE WHEN month_no IN (5, 6, 7, 8) THEN 0.04 ELSE 0 END
      + CASE WHEN month_no IN (11, 12) THEN 0.03 ELSE 0 END,
      0.82
    )
),
enumerated_bookings AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY booking_date, court_id, slot_id) AS rn,
    booking_date,
    slot_id,
    court_id,
    price_vnd,
    start_time,
    end_time
  FROM selected_slots
),
assigned_users AS (
  SELECT
    eb.rn,
    eb.booking_date,
    eb.slot_id,
    eb.court_id,
    eb.price_vnd,
    eb.start_time,
    eb.end_time,
    up.user_id
  FROM enumerated_bookings eb
  CROSS JOIN user_count uc
  JOIN user_pool up ON up.user_idx = ((eb.rn * 17 - 1) % uc.cnt) + 1
),
booking_facts AS (
  SELECT
    au.*,
    random() AS booking_random,
    random() AS amount_random,
    random() AS timing_random
  FROM assigned_users au
),
prepared_bookings AS (
  SELECT
    bf.rn,
    bf.user_id,
    bf.court_id,
    bf.slot_id,
    bf.booking_date,
    CASE
      WHEN bf.booking_date > CURRENT_DATE THEN
        CASE
          WHEN bf.booking_random < 0.88 THEN 'CONFIRMED'
          ELSE 'LOCKED'
        END
      WHEN bf.booking_date = CURRENT_DATE THEN
        CASE
          WHEN bf.booking_random < 0.55 THEN 'COMPLETED'
          WHEN bf.booking_random < 0.75 THEN 'CONFIRMED'
          WHEN bf.booking_random < 0.92 THEN 'CANCELLED'
          ELSE 'REFUNDED'
        END
      WHEN bf.booking_date >= CURRENT_DATE - 2 THEN
        CASE
          WHEN bf.booking_random < 0.58 THEN 'COMPLETED'
          WHEN bf.booking_random < 0.78 THEN 'CONFIRMED'
          WHEN bf.booking_random < 0.93 THEN 'CANCELLED'
          ELSE 'REFUNDED'
        END
      ELSE
        CASE
          WHEN bf.booking_random < 0.72 THEN 'COMPLETED'
          WHEN bf.booking_random < 0.89 THEN 'CANCELLED'
          ELSE 'REFUNDED'
        END
      END AS status,
    (bf.price_vnd + (CASE WHEN bf.amount_random < 0.16 THEN 1000 WHEN bf.amount_random > 0.94 THEN 2000 ELSE 0 END))::int AS amount_vnd,
    'VND'::char(3) AS currency,
    bf.start_time,
    bf.end_time,
    CASE
      WHEN bf.booking_date > CURRENT_DATE THEN
        (bf.booking_date::timestamp - ((1 + FLOOR(bf.timing_random * 10))::int::text || ' days')::interval)
        + ((7 + FLOOR(bf.booking_random * 13))::int::text || ' hours')::interval
      ELSE
        (bf.booking_date::timestamp - ((2 + FLOOR(bf.timing_random * 20))::int::text || ' days')::interval)
        + ((8 + FLOOR(bf.booking_random * 12))::int::text || ' hours')::interval
    END AS created_at
  FROM booking_facts bf
),
stamped_bookings AS (
  SELECT
    pb.*,
    CASE
      WHEN pb.status IN ('CONFIRMED', 'COMPLETED', 'REFUNDED') THEN
        pb.created_at + ((10 + FLOOR(random() * 160))::int::text || ' minutes')::interval
      ELSE NULL
    END AS confirmed_at,
    CASE
      WHEN pb.status = 'CANCELLED' THEN
        pb.created_at + ((5 + FLOOR(random() * 240))::int::text || ' minutes')::interval
      ELSE NULL
    END AS cancelled_at,
    CASE
      WHEN pb.status = 'REFUNDED' THEN
        LEAST(
          pb.booking_date::timestamp + pb.start_time - interval '3 hours',
          pb.created_at + interval '2 days'
        )
      ELSE NULL
    END AS refunded_at,
    CASE
      WHEN pb.status = 'REFUNDED' THEN FLOOR(pb.amount_vnd * (0.55 + random() * 0.25))::int
      ELSE NULL
    END AS refund_amount_vnd,
    CASE
      WHEN pb.status = 'LOCKED' THEN 'lock:court:' || pb.court_id || ':slot:' || pb.slot_id || ':date:' || pb.booking_date::text
      ELSE NULL
    END AS lock_key,
    CASE
      WHEN pb.status = 'LOCKED' THEN md5('lock-' || pb.rn::text || '-' || pb.booking_date::text)
      ELSE NULL
    END AS lock_token,
    CASE
      WHEN pb.status = 'LOCKED' THEN NOW() + ((8 + FLOOR(random() * 18))::int::text || ' minutes')::interval
      ELSE NULL
    END AS lock_expires_at,
    CASE
      WHEN pb.status = 'LOCKED' THEN NOW() + ((8 + FLOOR(random() * 18))::int::text || ' minutes')::interval
      ELSE NULL
    END AS payment_due_at
  FROM prepared_bookings pb
),
inserted_bookings AS (
  INSERT INTO bookings (
    user_id,
    court_id,
    slot_id,
    booking_date,
    status,
    amount_vnd,
    currency,
    lock_key,
    lock_token,
    lock_expires_at,
    payment_due_at,
    confirmed_at,
    cancelled_at,
    refunded_at,
    refund_amount_vnd,
    created_at,
    updated_at
  )
  SELECT
    sb.user_id,
    sb.court_id,
    sb.slot_id,
    sb.booking_date,
    sb.status,
    sb.amount_vnd,
    sb.currency,
    sb.lock_key,
    sb.lock_token,
    sb.lock_expires_at,
    sb.payment_due_at,
    sb.confirmed_at,
    sb.cancelled_at,
    sb.refunded_at,
    sb.refund_amount_vnd,
    sb.created_at,
    GREATEST(
      sb.created_at,
      COALESCE(sb.confirmed_at, sb.created_at),
      COALESCE(sb.cancelled_at, sb.created_at),
      COALESCE(sb.refunded_at, sb.created_at),
      COALESCE(sb.lock_expires_at, sb.created_at)
    )
  FROM stamped_bookings sb
  RETURNING id, status, created_at
),
inserted_payments AS (
  INSERT INTO payments (
    booking_id,
    provider,
    provider_intent_id,
    status,
    amount_vnd,
    currency,
    provider_event_id,
    raw_payload,
    created_at,
    updated_at
  )
  SELECT
    b.id,
    CASE
      WHEN bk.status = 'CANCELLED' THEN 'failed_payment'
      WHEN bk.status = 'LOCKED' THEN 'sepay_pending'
      ELSE 'sepay'
    END,
    'ops_year_pi_' || b.id::text,
    CASE
      WHEN bk.status = 'CANCELLED' THEN 'failed'
      WHEN bk.status = 'LOCKED' THEN 'pending'
      ELSE 'succeeded'
    END,
    bk.amount_vnd,
    bk.currency,
    CASE
      WHEN bk.status IN ('COMPLETED', 'CONFIRMED', 'REFUNDED') THEN 'ops_year_evt_' || b.id::text
      ELSE NULL
    END,
    jsonb_build_object(
      'seed', true,
      'scenario', 'one_year_operational_demo',
      'bookingStatus', bk.status
    ),
    bk.created_at,
    bk.updated_at
  FROM inserted_bookings b
  JOIN bookings bk ON bk.id = b.id
  ON CONFLICT (booking_id) DO NOTHING
  RETURNING id
)
SELECT
  b.status,
  COUNT(*)::int AS total
FROM inserted_bookings b
GROUP BY b.status
ORDER BY b.status;
