const { query } = require('../config/db');

async function getRevenueSummary(startDate, endDate) {
  const totalResult = await query(
    `
      SELECT COALESCE(SUM(p.amount_cents), 0)::BIGINT AS total_revenue_cents
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE p.status = 'succeeded'
        AND b.status IN ('CONFIRMED', 'COMPLETED')
        AND b.booking_date BETWEEN $1 AND $2
    `,
    [startDate, endDate]
  );

  const dailyResult = await query(
    `
      SELECT
        b.booking_date::TEXT AS date,
        COALESCE(SUM(p.amount_cents), 0)::BIGINT AS revenue_cents
      FROM bookings b
      JOIN payments p ON p.booking_id = b.id
      WHERE p.status = 'succeeded'
        AND b.status IN ('CONFIRMED', 'COMPLETED')
        AND b.booking_date BETWEEN $1 AND $2
      GROUP BY b.booking_date
      ORDER BY b.booking_date ASC
    `,
    [startDate, endDate]
  );

  return {
    totalRevenueCents: Number(totalResult.rows[0].total_revenue_cents),
    dailySeries: dailyResult.rows.map((row) => ({
      date: row.date,
      revenueCents: Number(row.revenue_cents)
    }))
  };
}

async function getPeakHours(startDate, endDate) {
  const result = await query(
    `
      SELECT
        EXTRACT(HOUR FROM s.start_time)::INT AS hour,
        COUNT(*)::INT AS booking_count
      FROM bookings b
      JOIN court_slots s ON s.id = b.slot_id
      JOIN payments p ON p.booking_id = b.id
      WHERE b.status IN ('CONFIRMED', 'COMPLETED')
        AND p.status = 'succeeded'
        AND b.booking_date BETWEEN $1 AND $2
      GROUP BY hour
      ORDER BY booking_count DESC, hour ASC
    `,
    [startDate, endDate]
  );

  return result.rows.map((row) => ({
    hour: row.hour,
    bookingCount: row.booking_count
  }));
}

async function getConfirmedBookingCount(startDate, endDate) {
  const result = await query(
    `
      SELECT COUNT(*)::INT AS confirmed_count
      FROM bookings
      WHERE status IN ('CONFIRMED', 'COMPLETED')
        AND booking_date BETWEEN $1 AND $2
    `,
    [startDate, endDate]
  );

  return result.rows[0].confirmed_count;
}

async function getActiveSlotsPerDay() {
  const result = await query(
    `
      SELECT COUNT(*)::INT AS slots_per_day
      FROM court_slots s
      JOIN courts c ON c.id = s.court_id
      WHERE s.is_active = TRUE
        AND c.is_active = TRUE
    `
  );

  return result.rows[0].slots_per_day;
}

async function getTopUsersBySpend(startDate, endDate, limit) {
  const result = await query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        COUNT(DISTINCT b.id)::INT AS booking_count,
        COALESCE(SUM(p.amount_cents), 0)::BIGINT AS total_spend_cents
      FROM users u
      JOIN bookings b ON b.user_id = u.id
      JOIN payments p ON p.booking_id = b.id
      WHERE b.status IN ('CONFIRMED', 'COMPLETED')
        AND p.status = 'succeeded'
        AND b.booking_date BETWEEN $1 AND $2
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_spend_cents DESC, booking_count DESC
      LIMIT $3
    `,
    [startDate, endDate, limit]
  );

  return result.rows.map((row) => ({
    userId: row.id,
    fullName: row.full_name,
    email: row.email,
    bookingCount: Number(row.booking_count),
    totalSpendCents: Number(row.total_spend_cents)
  }));
}

async function getAnalyticsSummary() {
  const result = await query(
    `
      WITH booking_window AS (
        SELECT
          COALESCE(MIN(booking_date), CURRENT_DATE) AS min_date,
          COALESCE(MAX(booking_date), CURRENT_DATE) AS max_date
        FROM bookings
        WHERE status IN ('CONFIRMED', 'COMPLETED')
      ),
      slots_per_day AS (
        SELECT COUNT(*)::INT AS count
        FROM court_slots s
        JOIN courts c ON c.id = s.court_id
        WHERE c.is_active = TRUE AND s.is_active = TRUE
      )
      SELECT
        (
          SELECT COALESCE(SUM(p.amount_cents), 0)::BIGINT
          FROM payments p
          JOIN bookings b ON b.id = p.booking_id
          WHERE p.status = 'succeeded' AND b.status IN ('CONFIRMED', 'COMPLETED')
        ) AS total_revenue_cents,
        (
          SELECT COUNT(*)::INT
          FROM bookings
        ) AS total_bookings,
        (
          SELECT COUNT(*)::INT
          FROM users
          WHERE is_active = TRUE
        ) AS active_users,
        (
          SELECT COUNT(*)::INT
          FROM bookings
          WHERE status IN ('CONFIRMED', 'COMPLETED')
        ) AS confirmed_bookings,
        (
          SELECT count FROM slots_per_day
        ) AS slots_per_day,
        (
          SELECT (max_date - min_date + 1)::INT
          FROM booking_window
        ) AS booking_days
    `
  );

  return result.rows[0];
}

async function getUtilizationByCourt() {
  const result = await query(
    `
      WITH booking_window AS (
        SELECT
          COALESCE(MIN(booking_date), CURRENT_DATE) AS min_date,
          COALESCE(MAX(booking_date), CURRENT_DATE) AS max_date
        FROM bookings
      )
      SELECT
        c.id AS court_id,
        c.name AS court_name,
        COALESCE(confirmed.confirmed_slots, 0)::INT AS confirmed_slots,
        (COALESCE(active_slots.active_slot_count, 0) * ((w.max_date - w.min_date + 1)::INT))::INT AS total_available_slots
      FROM courts c
      CROSS JOIN booking_window w
      LEFT JOIN (
        SELECT b.court_id, COUNT(*)::INT AS confirmed_slots
        FROM bookings b
        WHERE b.status IN ('CONFIRMED', 'COMPLETED')
        GROUP BY b.court_id
      ) confirmed ON confirmed.court_id = c.id
      LEFT JOIN (
        SELECT s.court_id, COUNT(*)::INT AS active_slot_count
        FROM court_slots s
        WHERE s.is_active = TRUE
        GROUP BY s.court_id
      ) active_slots ON active_slots.court_id = c.id
      WHERE c.is_active = TRUE
      ORDER BY c.id ASC
    `
  );

  return result.rows.map((row) => {
    const confirmedSlots = Number(row.confirmed_slots || 0);
    const totalAvailableSlots = Number(row.total_available_slots || 0);
    const utilizationRate = totalAvailableSlots > 0 ? confirmedSlots / totalAvailableSlots : 0;

    return {
      courtId: Number(row.court_id),
      courtName: row.court_name,
      confirmedSlots,
      totalAvailableSlots,
      utilizationRate,
      utilizationPercent: Number((utilizationRate * 100).toFixed(2))
    };
  });
}

module.exports = {
  getRevenueSummary,
  getPeakHours,
  getConfirmedBookingCount,
  getActiveSlotsPerDay,
  getTopUsersBySpend,
  getAnalyticsSummary,
  getUtilizationByCourt
};
