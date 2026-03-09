const crypto = require('crypto');
const { withTransaction } = require('../config/db');
const { env } = require('../config/env');
const Role = require('../models/role');
const BookingStatus = require('../models/booking-status');
const ApiError = require('../utils/api-error');
const bookingRepository = require('../repositories/booking.repository');
const paymentRepository = require('../repositories/payment.repository');
const lockService = require('./lock.service');
const { emitSlotUpdated } = require('../sockets/booking.socket');
const { toSlotUpdatedPayload } = require('./booking.service');

function generatePaymentIntentId() {
  return `pi_${crypto.randomUUID().replace(/-/g, '')}`;
}

function generateClientSecret() {
  return `cs_${crypto.randomUUID().replace(/-/g, '')}`;
}

function parseStripeSignatureHeader(signatureHeader) {
  return signatureHeader.split(',').reduce((acc, token) => {
    const [key, value] = token.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) {
    throw new ApiError(400, 'Missing stripe-signature header', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.t || !parsed.v1) {
    throw new ApiError(400, 'Malformed stripe-signature header', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const timestamp = Number.parseInt(parsed.t, 10);
  if (Number.isNaN(timestamp)) {
    throw new ApiError(400, 'Invalid webhook timestamp', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const ageInSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageInSeconds > env.PAYMENT_WEBHOOK_TOLERANCE_SECONDS) {
    throw new ApiError(400, 'Webhook signature timestamp is outside tolerance', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const signedPayload = `${parsed.t}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  let isValid = false;
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(parsed.v1, 'hex');
    isValid =
      expectedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (_error) {
    isValid = false;
  }

  if (!isValid) {
    throw new ApiError(400, 'Invalid webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
  }
}

async function createPaymentIntent(currentUser, { bookingId, currency }) {
  const parsedBookingId = Number(bookingId);
  if (!Number.isInteger(parsedBookingId)) {
    throw new ApiError(400, 'bookingId must be an integer', 'VALIDATION_ERROR');
  }

  const requestedCurrency = String(currency || env.DEFAULT_CURRENCY).toUpperCase();

  const response = await withTransaction(async (client) => {
    const booking = await bookingRepository.findBookingByIdForUpdate(client, parsedBookingId);

    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (currentUser.role !== Role.ADMIN && booking.user_id !== currentUser.id) {
      throw new ApiError(403, 'Cannot pay for another user booking', 'FORBIDDEN');
    }

    if (booking.status !== BookingStatus.LOCKED) {
      throw new ApiError(409, 'Booking is not in LOCKED state', 'BOOKING_NOT_LOCKED');
    }

    if (!booking.lock_expires_at || new Date(booking.lock_expires_at).getTime() <= Date.now()) {
      throw new ApiError(409, 'Booking lock has expired', 'BOOKING_LOCK_EXPIRED');
    }

    if (requestedCurrency !== booking.currency) {
      throw new ApiError(400, `Currency mismatch. Expected ${booking.currency}`, 'CURRENCY_MISMATCH');
    }

    const existingPayment = await paymentRepository.findPaymentByBookingId(parsedBookingId, client);
    if (existingPayment && existingPayment.status === 'succeeded') {
      throw new ApiError(409, 'Booking payment is already completed', 'PAYMENT_ALREADY_COMPLETED');
    }

    const providerIntentId = generatePaymentIntentId();
    const clientSecret = generateClientSecret();

    const payment = await paymentRepository.upsertPaymentIntent(client, {
      bookingId: parsedBookingId,
      provider: env.PAYMENT_PROVIDER,
      providerIntentId,
      clientSecret,
      status: 'requires_confirmation',
      amountCents: booking.amount_cents,
      currency: booking.currency
    });

    return {
      paymentIntentId: payment.provider_intent_id,
      clientSecret: payment.client_secret,
      provider: payment.provider,
      amountCents: Number(payment.amount_cents),
      currency: payment.currency,
      bookingId: Number(payment.booking_id),
      bookingStatus: booking.status,
      lockExpiresAt: booking.lock_expires_at
    };
  });

  return response;
}

async function handleWebhook(rawBody, signatureHeader) {
  if (!Buffer.isBuffer(rawBody)) {
    throw new ApiError(400, 'Webhook endpoint requires raw request body', 'INVALID_WEBHOOK_PAYLOAD');
  }

  verifyWebhookSignature(rawBody, signatureHeader);

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (_error) {
    throw new ApiError(400, 'Webhook payload is not valid JSON', 'INVALID_WEBHOOK_PAYLOAD');
  }

  if (!event.id || !event.type) {
    throw new ApiError(400, 'Webhook payload is missing id/type', 'INVALID_WEBHOOK_PAYLOAD');
  }

  const supportedTypes = ['payment_intent.succeeded', 'payment_intent.payment_failed'];
  if (!supportedTypes.includes(event.type)) {
    return {
      received: true,
      ignored: true,
      reason: 'Unsupported event type'
    };
  }

  const providerIntentId = event.data && event.data.object && event.data.object.id;
  if (!providerIntentId) {
    throw new ApiError(400, 'Webhook payload missing payment intent id', 'INVALID_WEBHOOK_PAYLOAD');
  }

  let releaseInfo = null;
  let slotUpdatedPayload = null;

  const result = await withTransaction(async (client) => {
    const eventRecorded = await paymentRepository.recordWebhookEvent(client, {
      provider: env.PAYMENT_PROVIDER,
      eventId: event.id,
      eventType: event.type,
      payload: event
    });

    if (!eventRecorded) {
      return {
        received: true,
        duplicate: true
      };
    }

    const payment = await paymentRepository.findPaymentByProviderIntentId(providerIntentId, client, true);
    if (!payment) {
      return {
        received: true,
        ignored: true,
        reason: 'Payment intent not found'
      };
    }

    const booking = await bookingRepository.findBookingByIdForUpdate(client, payment.booking_id);
    if (!booking) {
      return {
        received: true,
        ignored: true,
        reason: 'Booking not found'
      };
    }

    if (event.type === 'payment_intent.succeeded') {
      await paymentRepository.markPaymentSucceeded(client, {
        paymentId: payment.id,
        providerEventId: event.id,
        rawPayload: event
      });

      if (booking.status === BookingStatus.LOCKED && booking.lock_expires_at && new Date(booking.lock_expires_at).getTime() > Date.now()) {
        const confirmed = await bookingRepository.markBookingConfirmed(client, booking.id);
        releaseInfo = {
          lockKey: booking.lock_key,
          lockToken: booking.lock_token
        };
        slotUpdatedPayload = toSlotUpdatedPayload(confirmed);
      }

      if (booking.status === BookingStatus.LOCKED && booking.lock_expires_at && new Date(booking.lock_expires_at).getTime() <= Date.now()) {
        const cancelled = await bookingRepository.cancelBooking(client, booking.id);
        releaseInfo = {
          lockKey: booking.lock_key,
          lockToken: booking.lock_token
        };
        slotUpdatedPayload = toSlotUpdatedPayload(cancelled);
      }

      return {
        received: true,
        processed: true,
        eventType: event.type,
        bookingId: Number(booking.id)
      };
    }

    await paymentRepository.markPaymentFailed(client, {
      paymentId: payment.id,
      providerEventId: event.id,
      rawPayload: event
    });

    return {
      received: true,
      processed: true,
      eventType: event.type,
      bookingId: Number(booking.id)
    };
  });

  if (releaseInfo && releaseInfo.lockKey && releaseInfo.lockToken) {
    await lockService.releaseLock(releaseInfo.lockKey, releaseInfo.lockToken);
  }

  if (slotUpdatedPayload) {
    emitSlotUpdated(slotUpdatedPayload);
  }

  return result;
}

module.exports = {
  createPaymentIntent,
  handleWebhook
};
