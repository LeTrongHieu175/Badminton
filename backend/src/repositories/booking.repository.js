const { pool } = require('../config/db');

function dbClient(client) {
  return client || pool;
}

async function cancelExpiredLocksForSlot(client, { courtId, slotId, bookingDate }) {
  const result = await dbClient(client).query(
    `
      UPDATE bookings
      SET status = 'CANCELLED',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE court_id = $1
        AND slot_id = $2
        AND booking_date = $3
        AND status = 'LOCKED'
        AND lock_expires_at <= NOW()
      RETURNING id, court_id, slot_id, booking_date, status, lock_expires_at, updated_at
    `,
    [courtId, slotId, bookingDate]
  );

  return result.rows;
}

async function findActiveBookingForSlot(client, { courtId, slotId, bookingDate, forUpdate = false }) {
  const queryText = `
    SELECT id, user_id, court_id, slot_id, booking_date, status, lock_expires_at
    FROM bookings
    WHERE court_id = $1
      AND slot_id = $2
      AND booking_date = $3
      AND (
        status = 'CONFIRMED'
        OR (status = 'LOCKED' AND lock_expires_at > NOW())
      )
    ORDER BY created_at DESC
    LIMIT 1
    ${forUpdate ? 'FOR UPDATE' : ''}
  `;

  const result = await dbClient(client).query(queryText, [courtId, slotId, bookingDate]);
  return result.rows[0] || null;
}

async function createLockedBooking(
  client,
  {
    userId,
    courtId,
    slotId,
    bookingDate,
    amountCents,
    currency,
    lockKey,
    lockToken,
    lockExpiresAt
  }
) {
  const result = await dbClient(client).query(
    `
      INSERT INTO bookings (
        user_id,
        court_id,
        slot_id,
        booking_date,
        status,
        amount_cents,
        currency,
        lock_key,
        lock_token,
        lock_expires_at,
        payment_due_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'LOCKED',
        $5,
        $6,
        $7,
        $8,
        $9,
        $9,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        user_id,
        court_id,
        slot_id,
        booking_date,
        status,
        amount_cents,
        currency,
        lock_key,
        lock_token,
        lock_expires_at,
        payment_due_at,
        created_at,
        updated_at
    `,
    [userId, courtId, slotId, bookingDate, amountCents, currency, lockKey, lockToken, lockExpiresAt]
  );

  return result.rows[0];
}

async function findBookingById(bookingId) {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.user_id,
        b.court_id,
        b.slot_id,
        b.booking_date,
        b.status,
        b.amount_cents,
        b.currency,
        b.lock_key,
        b.lock_token,
        b.lock_expires_at,
        b.confirmed_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at,
        c.name AS court_name,
        s.label AS slot_label,
        s.start_time,
        s.end_time
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      JOIN court_slots s ON s.id = b.slot_id
      WHERE b.id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  return result.rows[0] || null;
}

async function findBookingByIdForUpdate(client, bookingId) {
  const result = await dbClient(client).query(
    `
      SELECT
        id,
        user_id,
        court_id,
        slot_id,
        booking_date,
        status,
        amount_cents,
        currency,
        lock_key,
        lock_token,
        lock_expires_at,
        payment_due_at,
        confirmed_at,
        cancelled_at,
        created_at,
        updated_at
      FROM bookings
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  return result.rows[0] || null;
}

async function listBookingsByUserId(userId, { limit, offset }) {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.user_id,
        b.court_id,
        b.slot_id,
        b.booking_date,
        b.status,
        b.amount_cents,
        b.currency,
        b.lock_expires_at,
        b.confirmed_at,
        b.cancelled_at,
        b.created_at,
        c.name AS court_name,
        s.label AS slot_label,
        s.start_time,
        s.end_time
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      JOIN court_slots s ON s.id = b.slot_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );

  return result.rows;
}

async function countBookingsByUserId(userId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::INT AS count
      FROM bookings
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0].count;
}

function buildAdminBookingFilters({ userId, status, dateFrom, dateTo }) {
  const clauses = [];
  const values = [];

  if (userId !== undefined && userId !== null) {
    clauses.push(`b.user_id = $${values.length + 1}`);
    values.push(userId);
  }

  if (status) {
    clauses.push(`b.status = $${values.length + 1}`);
    values.push(status);
  }

  if (dateFrom) {
    clauses.push(`b.booking_date >= $${values.length + 1}`);
    values.push(dateFrom);
  }

  if (dateTo) {
    clauses.push(`b.booking_date <= $${values.length + 1}`);
    values.push(dateTo);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  };
}

async function listAllBookings({ userId, status, dateFrom, dateTo, limit, offset }) {
  const { whereClause, values } = buildAdminBookingFilters({ userId, status, dateFrom, dateTo });
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.user_id,
        b.court_id,
        b.slot_id,
        b.booking_date,
        b.status,
        b.amount_cents,
        b.currency,
        b.lock_expires_at,
        b.confirmed_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at,
        COALESCE(NULLIF(u.full_name, ''), u.username, u.email) AS user_name,
        c.name AS court_name,
        s.label AS slot_label,
        s.start_time,
        s.end_time
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN courts c ON c.id = b.court_id
      JOIN court_slots s ON s.id = b.slot_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );

  return result.rows;
}

async function countAllBookings({ userId, status, dateFrom, dateTo }) {
  const { whereClause, values } = buildAdminBookingFilters({ userId, status, dateFrom, dateTo });
  const result = await pool.query(
    `
      SELECT COUNT(*)::INT AS count
      FROM bookings b
      ${whereClause}
    `,
    values
  );

  return result.rows[0].count;
}

async function cancelBooking(client, bookingId) {
  const result = await dbClient(client).query(
    `
      UPDATE bookings
      SET status = 'CANCELLED',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        user_id,
        court_id,
        slot_id,
        booking_date,
        status,
        amount_cents,
        currency,
        lock_key,
        lock_token,
        lock_expires_at,
        confirmed_at,
        cancelled_at,
        created_at,
        updated_at
    `,
    [bookingId]
  );

  return result.rows[0] || null;
}

async function markBookingConfirmed(client, bookingId) {
  const result = await dbClient(client).query(
    `
      UPDATE bookings
      SET status = 'CONFIRMED',
          confirmed_at = NOW(),
          lock_expires_at = NULL,
          payment_due_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        user_id,
        court_id,
        slot_id,
        booking_date,
        status,
        lock_key,
        lock_token,
        updated_at
    `,
    [bookingId]
  );

  return result.rows[0] || null;
}

async function cancelExpiredLockedBookings(client, limit = 100) {
  const result = await dbClient(client).query(
    `
      WITH expired AS (
        SELECT id
        FROM bookings
        WHERE status = 'LOCKED'
          AND lock_expires_at <= NOW()
        ORDER BY lock_expires_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE bookings b
      SET status = 'CANCELLED',
          cancelled_at = NOW(),
          updated_at = NOW()
      FROM expired
      WHERE b.id = expired.id
      RETURNING
        b.id,
        b.user_id,
        b.court_id,
        b.slot_id,
        b.booking_date,
        b.status,
        b.lock_key,
        b.lock_token,
        b.lock_expires_at,
        b.updated_at
    `,
    [limit]
  );

  return result.rows;
}

module.exports = {
  cancelExpiredLocksForSlot,
  findActiveBookingForSlot,
  createLockedBooking,
  findBookingById,
  findBookingByIdForUpdate,
  listBookingsByUserId,
  countBookingsByUserId,
  listAllBookings,
  countAllBookings,
  cancelBooking,
  markBookingConfirmed,
  cancelExpiredLockedBookings
};
