const { query } = require('../config/db');

async function findSlotByIdAndCourt(slotId, courtId) {
  const result = await query(
    `
      SELECT id, court_id, label, start_time, end_time, price_vnd, is_active, created_at
      FROM court_slots
      WHERE id = $1 AND court_id = $2
      LIMIT 1
    `,
    [slotId, courtId]
  );

  return result.rows[0] || null;
}

async function listSlotsByCourtId(courtId, { includeInactive = false } = {}) {
  const result = await query(
    `
      SELECT id, court_id, label, start_time, end_time, price_vnd, is_active, created_at
      FROM court_slots
      WHERE court_id = $1
        AND ($2::boolean = TRUE OR is_active = TRUE)
      ORDER BY start_time ASC
    `,
    [courtId, includeInactive]
  );

  return result.rows;
}

async function createSlot({ courtId, label, startTime, endTime, priceVnd }) {
  const result = await query(
    `
      INSERT INTO court_slots (court_id, label, start_time, end_time, price_vnd, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
      RETURNING id, court_id, label, start_time, end_time, price_vnd, is_active, created_at
    `,
    [courtId, label, startTime, endTime, priceVnd]
  );

  return result.rows[0];
}

async function updateSlot(slotId, courtId, { label, startTime, endTime, priceVnd, isActive }) {
  const fields = [];
  const values = [];

  if (label !== undefined) {
    fields.push(`label = $${values.length + 1}`);
    values.push(label);
  }

  if (startTime !== undefined) {
    fields.push(`start_time = $${values.length + 1}`);
    values.push(startTime);
  }

  if (endTime !== undefined) {
    fields.push(`end_time = $${values.length + 1}`);
    values.push(endTime);
  }

  if (priceVnd !== undefined) {
    fields.push(`price_vnd = $${values.length + 1}`);
    values.push(priceVnd);
  }

  if (isActive !== undefined) {
    fields.push(`is_active = $${values.length + 1}`);
    values.push(Boolean(isActive));
  }

  if (fields.length === 0) {
    return findSlotByIdAndCourt(slotId, courtId);
  }

  values.push(slotId, courtId);

  const result = await query(
    `
      UPDATE court_slots
      SET ${fields.join(', ')}
      WHERE id = $${values.length - 1}
        AND court_id = $${values.length}
      RETURNING id, court_id, label, start_time, end_time, price_vnd, is_active, created_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function deactivateSlot(slotId, courtId) {
  const result = await query(
    `
      UPDATE court_slots
      SET is_active = FALSE
      WHERE id = $1
        AND court_id = $2
      RETURNING id, court_id, label, start_time, end_time, price_vnd, is_active, created_at
    `,
    [slotId, courtId]
  );

  return result.rows[0] || null;
}

async function listCourtAvailability(courtId, bookingDate) {
  const result = await query(
    `
      SELECT
        s.id AS slot_id,
        s.label,
        s.start_time,
        s.end_time,
        s.price_vnd,
        b.id AS booking_id,
        b.status AS booking_status,
        b.lock_expires_at,
        CASE
          WHEN b.status = 'CONFIRMED' THEN 'CONFIRMED'
          WHEN b.status = 'LOCKED' AND b.lock_expires_at > NOW() THEN 'LOCKED'
          ELSE 'AVAILABLE'
        END AS status
      FROM court_slots s
      LEFT JOIN LATERAL (
        SELECT b1.id, b1.status, b1.lock_expires_at
        FROM bookings b1
        WHERE b1.court_id = s.court_id
          AND b1.slot_id = s.id
          AND b1.booking_date = $2
          AND b1.status IN ('LOCKED', 'CONFIRMED')
        ORDER BY b1.created_at DESC
        LIMIT 1
      ) b ON TRUE
      WHERE s.court_id = $1
        AND s.is_active = TRUE
      ORDER BY s.start_time ASC
    `,
    [courtId, bookingDate]
  );

  return result.rows;
}

async function listAvailableSlotsByDate(bookingDate) {
  const result = await query(
    `
      SELECT
        c.id AS court_id,
        c.name AS court_name,
        c.location AS court_location,
        s.id AS slot_id,
        s.label,
        s.start_time,
        s.end_time,
        s.price_vnd,
        CASE
          WHEN b.status = 'CONFIRMED' THEN 'CONFIRMED'
          WHEN b.status = 'LOCKED' AND b.lock_expires_at > NOW() THEN 'LOCKED'
          ELSE 'AVAILABLE'
        END AS status
      FROM courts c
      JOIN court_slots s ON s.court_id = c.id
      LEFT JOIN LATERAL (
        SELECT b1.id, b1.status, b1.lock_expires_at
        FROM bookings b1
        WHERE b1.court_id = c.id
          AND b1.slot_id = s.id
          AND b1.booking_date = $1
          AND b1.status IN ('LOCKED', 'CONFIRMED')
        ORDER BY b1.created_at DESC
        LIMIT 1
      ) b ON TRUE
      WHERE c.is_active = TRUE
        AND s.is_active = TRUE
      ORDER BY c.id ASC, s.start_time ASC
    `,
    [bookingDate]
  );

  return result.rows;
}

module.exports = {
  findSlotByIdAndCourt,
  listSlotsByCourtId,
  createSlot,
  updateSlot,
  deactivateSlot,
  listCourtAvailability,
  listAvailableSlotsByDate
};
