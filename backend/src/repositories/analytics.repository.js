const { query } = require('../config/db');

async function getRevenueSummary(startDate, endDate) {
  const totalResult = await query(
    `
      SELECT COALESCE(SUM(p.amount_cents), 0)::BIGINT AS total_revenue_cents
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE p.status = 'succeeded'
        AND b.status = 'CONFIRMED'
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
        AND b.status = 'CONFIRMED'
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
      WHERE b.status = 'CONFIRMED'
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
      WHERE status = 'CONFIRMED'
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
      WHERE b.status = 'CONFIRMED'
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

module.exports = {
  getRevenueSummary,
  getPeakHours,
  getConfirmedBookingCount,
  getActiveSlotsPerDay,
  getTopUsersBySpend
};
