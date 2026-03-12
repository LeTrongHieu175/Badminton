-- Seed 1000 booking history records with mixed statuses:
-- COMPLETED, CANCELLED, REFUNDED, CONFIRMED
-- Includes Vietnamese user names and randomized created_at in past/current.

WITH
last_name(last_name) AS (
  VALUES
    ('Nguyễn'),
    ('Trần'),
    ('Lê'),
    ('Phạm'),
    ('Hoàng'),
    ('Huỳnh'),
    ('Phan'),
    ('Vũ'),
    ('Đặng'),
    ('Bùi')
),
middle_name(middle_name) AS (
  VALUES
    ('Văn'),
    ('Thị'),
    ('Hữu'),
    ('Đức'),
    ('Minh'),
    ('Quang'),
    ('Thanh'),
    ('Ngọc')
),
first_name(first_name) AS (
  VALUES
    ('An'),
    ('Anh'),
    ('Bình'),
    ('Châu'),
    ('Duy'),
    ('Giang'),
    ('Hải'),
    ('Hiếu'),
    ('Hùng'),
    ('Khánh'),
    ('Lan'),
    ('Linh'),
    ('Long'),
    ('Mai'),
    ('Nam'),
    ('Ngân'),
    ('Nhung'),
    ('Phúc'),
    ('Phương'),
    ('Quân'),
    ('Quỳnh'),
    ('Sơn'),
    ('Tâm'),
    ('Thảo'),
    ('Trang'),
    ('Trinh'),
    ('Tuấn'),
    ('Việt'),
    ('Vy'),
    ('Yến')
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
  LIMIT 160
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
    full_name || ' ' || LPAD(idx::text, 3, '0') AS username,
    full_name,
    '09' || LPAD((90000000 + idx)::text, 8, '0') AS phone,
    'seed.vn.' || idx || '@example.com' AS email,
    '$2b$10$c7xOkL.9bxlDDUQFxyOWqOr2oer2hBziv6gqk4FLJHmenhF.DtDQC',
    'user',
    TRUE,
    NOW() - ((idx % 720)::text || ' days')::interval,
    NOW()
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
    ROW_NUMBER() OVER (ORDER BY u.id) AS user_idx
  FROM users u
  WHERE u.role = 'user'
    AND u.is_active = TRUE
),
user_count AS (
  SELECT COUNT(*)::int AS cnt
  FROM user_pool
),
series AS (
  SELECT generate_series(1, 1000) AS rn
),
picked AS (
  SELECT
    s.rn,
    CASE
      WHEN s.rn % 10 IN (0, 1, 2, 3, 4) THEN 'COMPLETED'
      WHEN s.rn % 10 IN (5, 6, 7) THEN 'CANCELLED'
      WHEN s.rn % 10 = 8 THEN 'REFUNDED'
      ELSE 'CONFIRMED'
    END AS status,
    up.user_id,
    sp.court_id,
    sp.slot_id,
    sp.price_vnd,
    sp.start_time,
    sp.end_time
  FROM series s
  CROSS JOIN user_count uc
  CROSS JOIN slot_count sc
  JOIN user_pool up ON up.user_idx = ((s.rn - 1) % uc.cnt) + 1
  JOIN slot_pool sp ON sp.slot_idx = ((s.rn * 11 - 1) % sc.cnt) + 1
),
prepared AS (
  SELECT
    p.rn,
    p.status,
    p.user_id,
    p.court_id,
    p.slot_id,
    p.price_vnd,
    p.start_time,
    p.end_time,
    CASE
      -- Keep CONFIRMED rows in future so they remain CONFIRMED after background job.
      WHEN p.status = 'CONFIRMED' THEN (CURRENT_DATE + p.rn)
      ELSE (CURRENT_DATE - ((p.rn % 365) + 1))
    END::date AS booking_date
  FROM picked p
),
stamped AS (
  SELECT
    pr.*,
    CASE
      WHEN pr.status = 'CONFIRMED' THEN
        NOW()
        - ((FLOOR(random() * 180))::int::text || ' days')::interval
        - ((FLOOR(random() * 86400))::int::text || ' seconds')::interval
      ELSE
        pr.booking_date::timestamp
        - ((FLOOR(random() * 90) + 1)::int::text || ' days')::interval
        - ((FLOOR(random() * 86400))::int::text || ' seconds')::interval
    END AS created_at
  FROM prepared pr
),
booking_rows AS (
  SELECT
    st.rn,
    st.user_id,
    st.court_id,
    st.slot_id,
    st.booking_date,
    st.status,
    st.price_vnd AS amount_vnd,
    'VND'::char(3) AS currency,
    st.created_at,
    CASE
      WHEN st.status IN ('CONFIRMED', 'COMPLETED', 'REFUNDED')
        THEN st.created_at + ((FLOOR(random() * 180) + 30)::int::text || ' minutes')::interval
      ELSE NULL
    END AS confirmed_at,
    CASE
      WHEN st.status = 'CANCELLED'
        THEN st.created_at + ((FLOOR(random() * 120) + 10)::int::text || ' minutes')::interval
      ELSE NULL
    END AS cancelled_at,
    CASE
      WHEN st.status = 'REFUNDED'
        THEN (st.booking_date::timestamp + st.start_time) - interval '6 hours'
      ELSE NULL
    END AS refunded_at,
    CASE
      WHEN st.status = 'REFUNDED'
        THEN FLOOR(st.price_vnd * 0.7)::int
      ELSE NULL
    END AS refund_amount_vnd
  FROM stamped st
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
    br.user_id,
    br.court_id,
    br.slot_id,
    br.booking_date,
    br.status,
    br.amount_vnd,
    br.currency,
    NULL,
    NULL,
    NULL,
    NULL,
    br.confirmed_at,
    br.cancelled_at,
    br.refunded_at,
    br.refund_amount_vnd,
    br.created_at,
    GREATEST(
      br.created_at,
      COALESCE(br.confirmed_at, br.created_at),
      COALESCE(br.cancelled_at, br.created_at),
      COALESCE(br.refunded_at, br.created_at)
    )
  FROM booking_rows br
  RETURNING id, status
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
    CASE WHEN b.status = 'CANCELLED' THEN 'manual_cancelled' ELSE 'sepay' END,
    'seed_pi_' || b.id::text,
    CASE WHEN b.status = 'CANCELLED' THEN 'failed' ELSE 'succeeded' END,
    bk.amount_vnd,
    bk.currency,
    CASE WHEN b.status = 'CANCELLED' THEN NULL ELSE 'seed_evt_' || b.id::text END,
    jsonb_build_object('seed', true, 'bookingStatus', b.status),
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
