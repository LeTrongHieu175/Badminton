BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  location TEXT NOT NULL,
  price_per_hour NUMERIC(10, 2) NOT NULL CHECK (price_per_hour > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE'))
);

CREATE TABLE IF NOT EXISTS time_slots (
  id BIGSERIAL PRIMARY KEY,
  court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE (court_id, start_time, end_time),
  UNIQUE (court_id, id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  slot_id BIGINT NOT NULL,
  booking_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'PAID', 'FAILED', 'REFUNDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bookings_slot_court
    FOREIGN KEY (court_id, slot_id)
    REFERENCES time_slots(court_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  method VARCHAR(20) NOT NULL CHECK (method IN ('CARD', 'CASH', 'E_WALLET', 'BANK_TRANSFER')),
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings(court_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_date ON bookings(slot_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_time_slots_court ON time_slots(court_id, start_time);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_reviews_court_rating ON reviews(court_id, rating);

COMMIT;
