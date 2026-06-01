const { pool, query } = require('../config/db');

async function normalizeHistoryDemo() {
  const result = await query(`
    WITH target_bookings AS (
      SELECT
        b.id,
        b.status AS old_status,
        b.booking_date AS old_booking_date,
        s.start_time,
        ((b.id * 37) % 515)::int AS offset_days,
        ((b.id * 17) % 100)::int AS status_bucket
      FROM bookings b
      JOIN court_slots s ON s.id = b.slot_id
      WHERE b.status IN ('LOCKED', 'CONFIRMED')
         OR b.booking_date >= CURRENT_DATE
    ),
    normalized AS (
      SELECT
        tb.id,
        CASE
          WHEN tb.status_bucket < 72 THEN 'COMPLETED'
          WHEN tb.status_bucket < 89 THEN 'CANCELLED'
          ELSE 'REFUNDED'
        END AS new_status,
        (DATE '2025-01-01' + tb.offset_days) AS new_booking_date,
        ((DATE '2025-01-01' + tb.offset_days)::timestamp - (((tb.id * 13) % 21 + 2)::text || ' days')::interval)
          + ((8 + ((tb.id * 7) % 12))::text || ' hours')::interval AS new_created_at,
        tb.start_time
      FROM target_bookings tb
    ),
    updated_bookings AS (
      UPDATE bookings b
      SET
        status = n.new_status,
        booking_date = n.new_booking_date,
        lock_key = NULL,
        lock_token = NULL,
        lock_expires_at = NULL,
        payment_due_at = NULL,
        confirmed_at = CASE
          WHEN n.new_status IN ('COMPLETED', 'REFUNDED')
            THEN n.new_created_at + (((b.id * 19) % 160 + 10)::text || ' minutes')::interval
          ELSE NULL
        END,
        cancelled_at = CASE
          WHEN n.new_status = 'CANCELLED'
            THEN n.new_created_at + (((b.id * 11) % 240 + 5)::text || ' minutes')::interval
          ELSE NULL
        END,
        refunded_at = CASE
          WHEN n.new_status = 'REFUNDED'
            THEN LEAST(
              (n.new_booking_date::timestamp + n.start_time) - interval '3 hours',
              n.new_created_at + interval '2 days'
            )
          ELSE NULL
        END,
        refund_amount_vnd = CASE
          WHEN n.new_status = 'REFUNDED'
            THEN GREATEST(FLOOR(b.amount_vnd * (0.55 + (((b.id * 23) % 26)::numeric / 100)))::int, 0)
          ELSE NULL
        END,
        created_at = n.new_created_at,
        updated_at = GREATEST(
          n.new_created_at,
          COALESCE(
            CASE
              WHEN n.new_status IN ('COMPLETED', 'REFUNDED')
                THEN n.new_created_at + (((b.id * 19) % 160 + 10)::text || ' minutes')::interval
              ELSE NULL
            END,
            n.new_created_at
          ),
          COALESCE(
            CASE
              WHEN n.new_status = 'CANCELLED'
                THEN n.new_created_at + (((b.id * 11) % 240 + 5)::text || ' minutes')::interval
              ELSE NULL
            END,
            n.new_created_at
          ),
          COALESCE(
            CASE
              WHEN n.new_status = 'REFUNDED'
                THEN LEAST(
                  (n.new_booking_date::timestamp + n.start_time) - interval '3 hours',
                  n.new_created_at + interval '2 days'
                )
              ELSE NULL
            END,
            n.new_created_at
          )
        )
      FROM normalized n
      WHERE b.id = n.id
      RETURNING b.id, n.new_status AS status
    ),
    updated_payments AS (
      UPDATE payments p
      SET
        provider = CASE
          WHEN ub.status = 'CANCELLED' THEN 'failed_payment'
          ELSE 'sepay'
        END,
        status = CASE
          WHEN ub.status = 'CANCELLED' THEN 'failed'
          ELSE 'succeeded'
        END,
        provider_event_id = CASE
          WHEN ub.status IN ('COMPLETED', 'REFUNDED') THEN 'normalized_evt_' || p.booking_id::text
          ELSE NULL
        END,
        raw_payload = jsonb_build_object(
          'normalized', true,
          'scenario', 'history_only_demo',
          'bookingStatus', ub.status
        ),
        updated_at = NOW()
      FROM updated_bookings ub
      WHERE p.booking_id = ub.id
      RETURNING p.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM updated_bookings) AS updated_bookings,
      (SELECT COUNT(*)::int FROM updated_payments) AS updated_payments
  `);

  return result.rows[0] || { updated_bookings: 0, updated_payments: 0 };
}

if (require.main === module) {
  normalizeHistoryDemo()
    .then((summary) => {
      console.log('[db] normalized active/future bookings into history', summary);
    })
    .catch((error) => {
      console.error('[db] normalize history demo failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  normalizeHistoryDemo
};
