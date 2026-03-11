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

function normalizeTransferCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase();
}

function getExpectedTransferCode(bookingId) {
  return normalizeTransferCode(`${env.SEPAY_TRANSFER_PREFIX}-${bookingId}`);
}

function parseAmountValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return Math.round(numeric);
  }

  // Some providers send amounts with separators like "10,000" or "10.000 VND".
  const digits = raw.replace(/[^\d-]/g, '');
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function extractNumericAmount(payload) {
  const candidates = [
    payload?.transferAmount,
    payload?.amount,
    payload?.transfer_amount,
    payload?.value,
    payload?.transactionAmount,
    payload?.transaction_amount,
    payload?.transaction?.transaction_amount,
    payload?.transaction?.amount,
    payload?.order?.order_total_amount,
    payload?.order?.order_amount
  ];

  for (const value of candidates) {
    const parsed = parseAmountValue(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function extractEventId(payload) {
  const candidates = [
    payload?.id,
    payload?.transactionId,
    payload?.transaction_id,
    payload?.txnId,
    payload?.referenceId,
    payload?.transaction?.id,
    payload?.transaction?.transaction_id,
    payload?.order?.id,
    payload?.order?.order_code
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return String(candidate).trim();
    }
  }

  const reference = String(
    payload?.referenceCode
      || payload?.code
      || payload?.content
      || payload?.description
      || payload?.transaction?.transaction_content
      || payload?.transaction?.transaction_description
      || payload?.order?.order_description
      || payload?.order?.order_invoice_number
      || 'unknown'
  ).trim();
  const amount = String(extractNumericAmount(payload) || '0');
  return `sepay:${reference}:${amount}`;
}

function extractProviderIntentId(payload) {
  const prefix = normalizeTransferCode(env.SEPAY_TRANSFER_PREFIX || 'BOOKING');
  const regex = new RegExp(`\\b${prefix}[-_\\s]?(\\d+)\\b`, 'i');

  const candidates = [
    payload?.code,
    payload?.referenceCode,
    payload?.reference_code,
    payload?.content,
    payload?.description,
    payload?.transactionContent,
    payload?.transaction_content,
    payload?.transaction?.transaction_content,
    payload?.transaction?.transaction_description,
    payload?.order?.order_description,
    payload?.order?.order_invoice_number
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (!normalized) {
      continue;
    }

    const match = normalized.match(regex);
    if (match && match[1]) {
      return `${prefix}-${match[1]}`;
    }
  }

  return null;
}

function extractBookingIdFromIntentId(providerIntentId) {
  if (!providerIntentId) {
    return null;
  }

  const match = providerIntentId.match(/-(\d+)$/);
  if (!match) {
    return null;
  }

  const bookingId = Number(match[1]);
  return Number.isInteger(bookingId) ? bookingId : null;
}

function isIncomingTransfer(payload) {
  const transferType = String(
    payload?.transferType
      || payload?.transfer_type
      || payload?.transaction?.transaction_type
      || payload?.transaction?.direction
      || ''
  )
    .trim()
    .toLowerCase();
  if (['in', 'incoming', 'credit'].includes(transferType)) {
    return true;
  }
  if (['out', 'outgoing', 'debit'].includes(transferType)) {
    return false;
  }

  const notificationType = String(payload?.notification_type || payload?.notificationType || '')
    .trim()
    .toLowerCase();
  if (notificationType) {
    if (notificationType.includes('paid') || notificationType.includes('success')) {
      return true;
    }
    if (notificationType.includes('fail') || notificationType.includes('cancel')) {
      return false;
    }
  }

  const transactionStatus = String(payload?.transaction?.transaction_status || payload?.transactionStatus || '')
    .trim()
    .toLowerCase();
  if (['approved', 'paid', 'success', 'succeeded', 'completed'].includes(transactionStatus)) {
    return true;
  }
  if (['failed', 'declined', 'cancelled', 'canceled'].includes(transactionStatus)) {
    return false;
  }

  // Default to incoming for unknown formats to avoid dropping valid IPN notifications.
  return true;
}

function verifyWebhookSecret(headers) {
  const configuredSecret = String(env.SEPAY_IPN_SECRET || '').trim();
  if (!configuredSecret) {
    throw new ApiError(500, 'Missing SePay IPN secret configuration', 'SEPAY_NOT_CONFIGURED');
  }

  const acceptedValues = [
    configuredSecret,
    `Apikey ${configuredSecret}`,
    `Bearer ${configuredSecret}`
  ];

  const headerCandidates = [
    headers?.authorization,
    headers?.Authorization,
    headers?.['x-secret-key'],
    headers?.['x-api-key'],
    headers?.['x-webhook-secret']
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (headerCandidates.length === 0) {
    throw new ApiError(401, 'Missing webhook auth header', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const isMatch = headerCandidates.some((headerValue) =>
    acceptedValues.some((accepted) => accepted.toLowerCase() === headerValue.toLowerCase())
  );
  if (!isMatch) {
    throw new ApiError(401, 'Invalid SePay IPN secret', 'INVALID_WEBHOOK_SIGNATURE');
  }
}

function buildQrUrl({ amountVnd, transferCode }) {
  const bankCode = encodeURIComponent(env.SEPAY_BANK_CODE);
  const accountNo = encodeURIComponent(env.BANK_ACCOUNT_NO);
  const accountName = encodeURIComponent(env.BANK_ACCOUNT_NAME);
  const addInfo = encodeURIComponent(transferCode);
  return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amountVnd}&addInfo=${addInfo}&accountName=${accountName}`;
}

async function createPaymentIntent(currentUser, { bookingId, currency }) {
  const parsedBookingId = Number(bookingId);
  if (!Number.isInteger(parsedBookingId)) {
    throw new ApiError(400, 'bookingId must be an integer', 'VALIDATION_ERROR');
  }

  const requestedCurrency = String(currency || env.DEFAULT_CURRENCY).toUpperCase();

  return withTransaction(async (client) => {
    const booking = await bookingRepository.findBookingByIdForUpdate(client, parsedBookingId);

    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (currentUser.role !== Role.ADMIN && Number(booking.user_id) !== Number(currentUser.id)) {
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

    const transferCode = getExpectedTransferCode(parsedBookingId);
    const payment = await paymentRepository.upsertPaymentIntent(client, {
      bookingId: parsedBookingId,
      provider: env.PAYMENT_PROVIDER,
      providerIntentId: transferCode,
      status: 'pending',
      amountVnd: Number(booking.amount_vnd),
      currency: booking.currency
    });

    return {
      provider: payment.provider,
      bookingId: Number(payment.booking_id),
      bookingStatus: booking.status,
      amountVnd: Number(payment.amount_vnd),
      currency: payment.currency,
      transferCode,
      bankName: env.BANK_NAME,
      bankCode: env.SEPAY_BANK_CODE,
      bankAccountNo: env.BANK_ACCOUNT_NO,
      bankAccountName: env.BANK_ACCOUNT_NAME,
      merchantCode: env.SEPAY_MERCHANT_CODE,
      qrUrl: buildQrUrl({
        amountVnd: Number(payment.amount_vnd),
        transferCode
      }),
      lockExpiresAt: booking.lock_expires_at
    };
  });
}

async function handleWebhook(rawBody, headers) {
  verifyWebhookSecret(headers);

  let payload;
  if (Buffer.isBuffer(rawBody)) {
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (_error) {
      throw new ApiError(400, 'Webhook payload is not valid JSON', 'INVALID_WEBHOOK_PAYLOAD');
    }
  } else if (rawBody && typeof rawBody === 'object') {
    payload = rawBody;
  } else {
    throw new ApiError(400, 'Webhook payload is invalid', 'INVALID_WEBHOOK_PAYLOAD');
  }

  if (!isIncomingTransfer(payload)) {
    console.info('[sepay-webhook] ignored: transfer is not incoming');
    return {
      received: true,
      ignored: true,
      reason: 'Not incoming transfer'
    };
  }

  const eventId = extractEventId(payload);
  const providerIntentId = extractProviderIntentId(payload);
  if (!providerIntentId) {
    console.warn('[sepay-webhook] rejected: missing transfer code in payload');
    throw new ApiError(400, 'Webhook payload missing transfer code', 'INVALID_WEBHOOK_PAYLOAD');
  }

  const bookingId = extractBookingIdFromIntentId(providerIntentId);
  if (!bookingId) {
    console.warn('[sepay-webhook] rejected: transfer code does not include booking id', { providerIntentId });
    throw new ApiError(400, 'Transfer code does not contain booking id', 'INVALID_WEBHOOK_PAYLOAD');
  }

  const transferAmount = extractNumericAmount(payload);
  if (!transferAmount) {
    console.warn('[sepay-webhook] rejected: missing transfer amount', { providerIntentId });
    throw new ApiError(400, 'Webhook payload missing transfer amount', 'INVALID_WEBHOOK_PAYLOAD');
  }

  let releaseInfo = null;
  let slotUpdatedPayload = null;

  const result = await withTransaction(async (client) => {
    const eventRecorded = await paymentRepository.recordWebhookEvent(client, {
      provider: env.PAYMENT_PROVIDER,
      eventId,
      eventType: 'transaction.in',
      payload
    });

    if (!eventRecorded) {
      console.info('[sepay-webhook] duplicate event ignored', { eventId });
      return {
        received: true,
        duplicate: true
      };
    }

    const payment = await paymentRepository.findPaymentByBookingId(bookingId, client);
    if (!payment || normalizeTransferCode(payment.provider_intent_id) !== providerIntentId) {
      console.warn('[sepay-webhook] ignored: payment intent not found', { providerIntentId, bookingId });
      return {
        received: true,
        ignored: true,
        reason: 'Payment intent not found'
      };
    }

    const booking = await bookingRepository.findBookingByIdForUpdate(client, payment.booking_id);
    if (!booking) {
      console.warn('[sepay-webhook] ignored: booking not found', { bookingId });
      return {
        received: true,
        ignored: true,
        reason: 'Booking not found'
      };
    }

    if (Number(booking.amount_vnd) !== transferAmount) {
      console.warn('[sepay-webhook] ignored: amount mismatch', {
        bookingId: Number(booking.id),
        expectedAmount: Number(booking.amount_vnd),
        transferAmount
      });
      return {
        received: true,
        ignored: true,
        reason: 'Amount mismatch'
      };
    }

    await paymentRepository.markPaymentSucceeded(client, {
      paymentId: payment.id,
      providerEventId: eventId,
      rawPayload: payload
    });

    if (booking.status === BookingStatus.LOCKED && booking.lock_expires_at && new Date(booking.lock_expires_at).getTime() > Date.now()) {
      const confirmed = await bookingRepository.markBookingConfirmed(client, booking.id);
      releaseInfo = {
        lockKey: booking.lock_key,
        lockToken: booking.lock_token
      };
      slotUpdatedPayload = toSlotUpdatedPayload(confirmed);
      return {
        received: true,
        processed: true,
        bookingId: Number(booking.id),
        status: BookingStatus.CONFIRMED
      };
    }

    if (booking.status === BookingStatus.LOCKED) {
      const cancelled = await bookingRepository.cancelBooking(client, booking.id);
      releaseInfo = {
        lockKey: booking.lock_key,
        lockToken: booking.lock_token
      };
      slotUpdatedPayload = toSlotUpdatedPayload(cancelled);
      return {
        received: true,
        processed: true,
        bookingId: Number(booking.id),
        status: BookingStatus.CANCELLED
      };
    }

    return {
      received: true,
      processed: true,
      bookingId: Number(booking.id),
      status: booking.status
    };
  });

  if (releaseInfo?.lockKey && releaseInfo?.lockToken) {
    await lockService.releaseLock(releaseInfo.lockKey, releaseInfo.lockToken);
  }

  if (slotUpdatedPayload) {
    emitSlotUpdated(slotUpdatedPayload);
  }

  if (result?.processed) {
    console.info('[sepay-webhook] processed', {
      bookingId: result.bookingId,
      status: result.status
    });
  }

  return result;
}

module.exports = {
  createPaymentIntent,
  handleWebhook
};
