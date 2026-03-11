const { pool } = require('../config/db');

function dbClient(client) {
  return client || pool;
}

async function upsertPaymentIntent(
  client,
  {
    bookingId,
    provider,
    providerIntentId,
    status,
    amountVnd,
    currency
  }
) {
  const result = await dbClient(client).query(
    `
      INSERT INTO payments (
        booking_id,
        provider,
        provider_intent_id,
        status,
        amount_vnd,
        currency,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (booking_id)
      DO UPDATE
      SET provider = EXCLUDED.provider,
          provider_intent_id = EXCLUDED.provider_intent_id,
          status = EXCLUDED.status,
          amount_vnd = EXCLUDED.amount_vnd,
          currency = EXCLUDED.currency,
          updated_at = NOW()
      RETURNING
        id,
        booking_id,
        provider,
        provider_intent_id,
        status,
        amount_vnd,
        currency,
        created_at,
        updated_at
    `,
    [bookingId, provider, providerIntentId, status, amountVnd, currency]
  );

  return result.rows[0];
}

async function findPaymentByProviderIntentId(providerIntentId, client = null, forUpdate = false) {
  const result = await dbClient(client).query(
    `
      SELECT
        id,
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
      FROM payments
      WHERE provider_intent_id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [providerIntentId]
  );

  return result.rows[0] || null;
}

async function findPaymentByBookingId(bookingId, client = null) {
  const result = await dbClient(client).query(
    `
      SELECT
        id,
        booking_id,
        provider,
        provider_intent_id,
        status,
        amount_vnd,
        currency,
        provider_event_id,
        created_at,
        updated_at
      FROM payments
      WHERE booking_id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  return result.rows[0] || null;
}

async function markPaymentSucceeded(client, { paymentId, providerEventId, rawPayload }) {
  const result = await dbClient(client).query(
    `
      UPDATE payments
      SET status = 'succeeded',
          provider_event_id = $2,
          raw_payload = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        booking_id,
        provider_intent_id,
        status,
        amount_vnd,
        currency,
        updated_at
    `,
    [paymentId, providerEventId, JSON.stringify(rawPayload)]
  );

  return result.rows[0] || null;
}

async function markPaymentFailed(client, { paymentId, providerEventId, rawPayload }) {
  const result = await dbClient(client).query(
    `
      UPDATE payments
      SET status = 'failed',
          provider_event_id = $2,
          raw_payload = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        booking_id,
        provider_intent_id,
        status,
        amount_vnd,
        currency,
        updated_at
    `,
    [paymentId, providerEventId, JSON.stringify(rawPayload)]
  );

  return result.rows[0] || null;
}

async function recordWebhookEvent(client, { provider, eventId, eventType, payload }) {
  const result = await dbClient(client).query(
    `
      INSERT INTO payment_events (provider, event_id, event_type, payload, received_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id, provider, event_id, event_type, received_at
    `,
    [provider, eventId, eventType, JSON.stringify(payload)]
  );

  return result.rows[0] || null;
}

module.exports = {
  upsertPaymentIntent,
  findPaymentByProviderIntentId,
  findPaymentByBookingId,
  markPaymentSucceeded,
  markPaymentFailed,
  recordWebhookEvent
};
