CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(60) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_unique ON users (phone)
  WHERE phone IS NOT NULL AND BTRIM(phone) <> '';

CREATE TABLE IF NOT EXISTS courts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS court_slots (
  id BIGSERIAL PRIMARY KEY,
  court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  label VARCHAR(50),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (court_id, start_time, end_time),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  slot_id BIGINT NOT NULL REFERENCES court_slots(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('LOCKED', 'CONFIRMED', 'CANCELLED')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  lock_key TEXT,
  lock_token TEXT,
  lock_expires_at TIMESTAMPTZ,
  payment_due_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
  ON bookings (court_id, slot_id, booking_date)
  WHERE status IN ('LOCKED', 'CONFIRMED');

CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings (user_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_lock_expiry ON bookings (status, lock_expires_at);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_date ON bookings (booking_date, status);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  provider_intent_id VARCHAR(128) NOT NULL UNIQUE,
  client_secret VARCHAR(128),
  status VARCHAR(32) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  provider_event_id VARCHAR(128),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  event_id VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_type ON payment_events (provider, event_type);
