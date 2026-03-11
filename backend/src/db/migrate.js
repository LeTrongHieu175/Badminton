const { query } = require('../config/db');

const LEGACY_SEED_HASH = '$2b$10$u6DPDI6G8jJW8Lw6SrgNnuvygM8Sxbl3vRLzN7cS5HYnlb7j3qEJG';
const DEFAULT_ADMIN_HASH = '$2b$10$tjIRskfjGFHUVQ/FzVdSReXe6NwOlzCgAjdVpf7Y0xVpG98UcwZ3a';
const DEFAULT_USER_HASH = '$2b$10$c7xOkL.9bxlDDUQFxyOWqOr2oer2hBziv6gqk4FLJHmenhF.DtDQC';

async function runMigrations() {
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(60)
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await query(`
    UPDATE users
    SET username = CONCAT(LOWER(SPLIT_PART(email, '@', 1)), '_', id)
    WHERE username IS NULL OR BTRIM(username) = ''
  `);

  await query(`
    ALTER TABLE users
    ALTER COLUMN username SET NOT NULL
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower
    ON users (LOWER(username))
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_unique
    ON users (phone)
    WHERE phone IS NOT NULL AND BTRIM(phone) <> ''
  `);

  await query(`
    ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_status_check
  `);

  await query(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('LOCKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REFUNDED'))
  `);

  await query(`
    DROP INDEX IF EXISTS uq_bookings_active_slot
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
    ON bookings (court_id, slot_id, booking_date)
    WHERE status IN ('LOCKED', 'CONFIRMED')
  `);

  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'court_slots'
          AND column_name = 'price_cents'
      ) THEN
        ALTER TABLE court_slots RENAME COLUMN price_cents TO price_vnd;
      END IF;
    END
    $$;
  `);

  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
          AND column_name = 'amount_cents'
      ) THEN
        ALTER TABLE bookings RENAME COLUMN amount_cents TO amount_vnd;
      END IF;
    END
    $$;
  `);

  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'amount_cents'
      ) THEN
        ALTER TABLE payments RENAME COLUMN amount_cents TO amount_vnd;
      END IF;
    END
    $$;
  `);

  await query(`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ
  `);

  await query(`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS refund_amount_vnd INTEGER
  `);

  await query(`
    ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_refund_amount_vnd_check
  `);

  await query(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_refund_amount_vnd_check
    CHECK (refund_amount_vnd IS NULL OR refund_amount_vnd >= 0)
  `);

  await query(`
    ALTER TABLE bookings
    ALTER COLUMN currency SET DEFAULT 'VND'
  `);

  await query(`
    ALTER TABLE payments
    ALTER COLUMN currency SET DEFAULT 'VND'
  `);

  await query(
    `
      UPDATE users
      SET password_hash = $1
      WHERE LOWER(email) = 'admin@smartbadminton.com'
        AND password_hash = $2
    `,
    [DEFAULT_ADMIN_HASH, LEGACY_SEED_HASH]
  );

  await query(
    `
      UPDATE users
      SET password_hash = $1
      WHERE LOWER(email) = 'john@example.com'
        AND password_hash = $2
    `,
    [DEFAULT_USER_HASH, LEGACY_SEED_HASH]
  );
}

module.exports = {
  runMigrations
};
