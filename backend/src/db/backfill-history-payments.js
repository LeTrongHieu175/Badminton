const { pool, query } = require('../config/db');

async function backfillHistoryPayments() {
  const result = await query(`
    WITH normalized_bookings AS (
      SELECT
        b.id AS booking_id,
        b.status AS booking_status,
        b.amount_vnd,
        b.currency,
        b.created_at,
        b.updated_at
      FROM bookings b
      WHERE b.status IN ('COMPLETED', 'CANCELLED', 'REFUNDED')
    ),
    updated_payments AS (
      UPDATE payments p
      SET
        provider = CASE
          WHEN nb.booking_status = 'CANCELLED' THEN 'failed_payment'
          ELSE 'sepay'
        END,
        status = CASE
          WHEN nb.booking_status = 'CANCELLED' THEN 'failed'
          ELSE 'succeeded'
        END,
        amount_vnd = nb.amount_vnd,
        currency = nb.currency,
        provider_event_id = CASE
          WHEN nb.booking_status IN ('COMPLETED', 'REFUNDED') THEN 'history_evt_' || nb.booking_id::text
          ELSE NULL
        END,
        raw_payload = jsonb_build_object(
          'backfilled', true,
          'scenario', 'historical_payment_alignment',
          'bookingStatus', nb.booking_status
        ),
        updated_at = GREATEST(p.updated_at, nb.updated_at, NOW())
      FROM normalized_bookings nb
      WHERE p.booking_id = nb.booking_id
      RETURNING p.id, p.booking_id
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
        nb.booking_id,
        CASE
          WHEN nb.booking_status = 'CANCELLED' THEN 'failed_payment'
          ELSE 'sepay'
        END,
        'history_pi_' || nb.booking_id::text,
        CASE
          WHEN nb.booking_status = 'CANCELLED' THEN 'failed'
          ELSE 'succeeded'
        END,
        nb.amount_vnd,
        nb.currency,
        CASE
          WHEN nb.booking_status IN ('COMPLETED', 'REFUNDED') THEN 'history_evt_' || nb.booking_id::text
          ELSE NULL
        END,
        jsonb_build_object(
          'backfilled', true,
          'scenario', 'historical_payment_alignment',
          'bookingStatus', nb.booking_status
        ),
        nb.created_at,
        nb.updated_at
      FROM normalized_bookings nb
      LEFT JOIN payments p ON p.booking_id = nb.booking_id
      WHERE p.id IS NULL
      RETURNING id, booking_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM normalized_bookings) AS historical_bookings,
      (SELECT COUNT(*)::int FROM updated_payments) AS updated_payments,
      (SELECT COUNT(*)::int FROM inserted_payments) AS inserted_payments
  `);

  return result.rows[0] || {
    historical_bookings: 0,
    updated_payments: 0,
    inserted_payments: 0
  };
}

if (require.main === module) {
  backfillHistoryPayments()
    .then((summary) => {
      console.log('[db] backfilled history payments', summary);
    })
    .catch((error) => {
      console.error('[db] backfill history payments failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  backfillHistoryPayments
};
