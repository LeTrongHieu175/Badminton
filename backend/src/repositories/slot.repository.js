const { query } = require('../config/db');

async function findSlotByIdAndCourt(slotId, courtId) {
  const result = await query(
    `
      SELECT id, court_id, label, start_time, end_time, price_cents, is_active
      FROM court_slots
      WHERE id = $1 AND court_id = $2
      LIMIT 1
    `,
    [slotId, courtId]
  );

  return result.rows[0] || null;
}

async function listSlotsByCourtId(courtId) {
  const result = await query(
    `
      SELECT id, court_id, label, start_time, end_time, price_cents, is_active
      FROM court_slots
      WHERE court_id = $1 AND is_active = TRUE
      ORDER BY start_time ASC
    `,
    [courtId]
  );

  return result.rows;
}

async function listCourtAvailability(courtId, bookingDate) {
  const result = await query(
    `
      SELECT
        s.id AS slot_id,
        s.label,
        s.start_time,
        s.end_time,
        s.price_cents,
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

module.exports = {
  findSlotByIdAndCourt,
  listSlotsByCourtId,
  listCourtAvailability
};
