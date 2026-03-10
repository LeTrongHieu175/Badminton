const crypto = require('crypto');
const { withTransaction } = require('../config/db');
const { env } = require('../config/env');
const BookingStatus = require('../models/booking-status');
const Role = require('../models/role');
const ApiError = require('../utils/api-error');
const { assertISODate, addSeconds } = require('../utils/date-time');
const courtRepository = require('../repositories/court.repository');
const slotRepository = require('../repositories/slot.repository');
const bookingRepository = require('../repositories/booking.repository');
const paymentRepository = require('../repositories/payment.repository');
const lockService = require('./lock.service');
const { emitSlotUpdated } = require('../sockets/booking.socket');

function toSlotUpdatedPayload(bookingRow) {
  return {
    courtId: Number(bookingRow.court_id),
    slotId: Number(bookingRow.slot_id),
    date: bookingRow.booking_date,
    status: bookingRow.status,
    bookingId: Number(bookingRow.id),
    lockExpiresAt: bookingRow.lock_expires_at,
    updatedAt: bookingRow.updated_at || new Date().toISOString()
  };
}

function toBookingResponse(bookingRow) {
  return {
    id: Number(bookingRow.id),
    userId: Number(bookingRow.user_id),
    courtId: Number(bookingRow.court_id),
    slotId: Number(bookingRow.slot_id),
    date: bookingRow.booking_date,
    status: bookingRow.status,
    amountCents: Number(bookingRow.amount_cents),
    currency: bookingRow.currency,
    lockExpiresAt: bookingRow.lock_expires_at,
    confirmedAt: bookingRow.confirmed_at,
    cancelledAt: bookingRow.cancelled_at,
    createdAt: bookingRow.created_at,
    updatedAt: bookingRow.updated_at
  };
}

async function createBooking(currentUser, { courtId, slotId, date }) {
  const normalizedCourtId = Number(courtId);
  const normalizedSlotId = Number(slotId);
  const bookingDate = String(date || '').trim();

  if (!Number.isInteger(normalizedCourtId) || !Number.isInteger(normalizedSlotId)) {
    throw new ApiError(400, 'courtId and slotId must be integers', 'VALIDATION_ERROR');
  }

  assertISODate(bookingDate, 'date');

  const court = await courtRepository.findCourtById(normalizedCourtId);
  if (!court || !court.is_active) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  const slot = await slotRepository.findSlotByIdAndCourt(normalizedSlotId, normalizedCourtId);
  if (!slot || !slot.is_active) {
    throw new ApiError(404, 'Slot not found for this court', 'SLOT_NOT_FOUND');
  }

  const lockKey = lockService.buildLockKey(normalizedCourtId, normalizedSlotId, bookingDate);
  const lockToken = lockService.createLockToken(currentUser.id);
  const lockTtl = env.BOOKING_LOCK_TTL_SECONDS;
  const lockExpiresAt = addSeconds(new Date(), lockTtl);

  const lockAcquired = await lockService.acquireLock(lockKey, lockToken, lockTtl);
  if (!lockAcquired) {
    throw new ApiError(409, 'Slot is currently locked by another user', 'SLOT_LOCKED');
  }

  let booking;
  try {
    booking = await withTransaction(async (client) => {
      await bookingRepository.cancelExpiredLocksForSlot(client, {
        courtId: normalizedCourtId,
        slotId: normalizedSlotId,
        bookingDate
      });

      const activeBooking = await bookingRepository.findActiveBookingForSlot(client, {
        courtId: normalizedCourtId,
        slotId: normalizedSlotId,
        bookingDate,
        forUpdate: true
      });

      if (activeBooking) {
        throw new ApiError(409, 'Slot is not available', 'SLOT_UNAVAILABLE');
      }

      return bookingRepository.createLockedBooking(client, {
        userId: currentUser.id,
        courtId: normalizedCourtId,
        slotId: normalizedSlotId,
        bookingDate,
        amountCents: slot.price_cents,
        currency: env.DEFAULT_CURRENCY,
        lockKey,
        lockToken,
        lockExpiresAt
      });
    });
  } catch (error) {
    await lockService.releaseLock(lockKey, lockToken);
    if (error.code === '23505') {
      throw new ApiError(409, 'Slot is not available', 'SLOT_UNAVAILABLE');
    }
    throw error;
  }

  emitSlotUpdated(toSlotUpdatedPayload(booking));
  return toBookingResponse(booking);
}

async function getUserBookings(currentUser, targetUserId, { page = 1, limit = 20 }) {
  const requestedUserId = Number(targetUserId);
  const normalizedCurrentUserId = Number(currentUser.id);
  if (!Number.isInteger(requestedUserId)) {
    throw new ApiError(400, 'user id must be an integer', 'VALIDATION_ERROR');
  }

  if (!Number.isInteger(normalizedCurrentUserId)) {
    throw new ApiError(401, 'Invalid user context', 'UNAUTHORIZED');
  }

  if (currentUser.role !== Role.ADMIN && normalizedCurrentUserId !== requestedUserId) {
    throw new ApiError(403, 'Cannot access bookings of another user', 'FORBIDDEN');
  }

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
  const offset = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    bookingRepository.listBookingsByUserId(requestedUserId, { limit: safeLimit, offset }),
    bookingRepository.countBookingsByUserId(requestedUserId)
  ]);

  return {
    items: items.map((row) => ({
      id: Number(row.id),
      userId: Number(row.user_id),
      courtId: Number(row.court_id),
      slotId: Number(row.slot_id),
      date: row.booking_date,
      status: row.status,
      amountCents: Number(row.amount_cents),
      currency: row.currency,
      lockExpiresAt: row.lock_expires_at,
      confirmedAt: row.confirmed_at,
      cancelledAt: row.cancelled_at,
      courtName: row.court_name,
      slotLabel: row.slot_label,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
}

async function getAllBookings(currentUser, { userId, status, dateFrom, dateTo, page = 1, limit = 20 }) {
  if (currentUser.role !== Role.ADMIN) {
    throw new ApiError(403, 'Admin permission required', 'FORBIDDEN');
  }

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
  const offset = (safePage - 1) * safeLimit;

  let normalizedUserId;
  if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
    normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedUserId)) {
      throw new ApiError(400, 'userId must be an integer', 'VALIDATION_ERROR');
    }
  }

  let normalizedStatus;
  if (status !== undefined && status !== null && String(status).trim() !== '') {
    normalizedStatus = String(status).trim().toUpperCase();
    const allowedStatuses = [
      BookingStatus.LOCKED,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED
    ];
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new ApiError(400, 'status must be LOCKED, CONFIRMED, COMPLETED, or CANCELLED', 'VALIDATION_ERROR');
    }
  }

  let normalizedDateFrom;
  if (dateFrom !== undefined && dateFrom !== null && String(dateFrom).trim() !== '') {
    normalizedDateFrom = String(dateFrom).trim();
    assertISODate(normalizedDateFrom, 'dateFrom');
  }

  let normalizedDateTo;
  if (dateTo !== undefined && dateTo !== null && String(dateTo).trim() !== '') {
    normalizedDateTo = String(dateTo).trim();
    assertISODate(normalizedDateTo, 'dateTo');
  }

  if (normalizedDateFrom && normalizedDateTo) {
    const fromDate = new Date(`${normalizedDateFrom}T00:00:00.000Z`);
    const toDate = new Date(`${normalizedDateTo}T00:00:00.000Z`);
    if (fromDate > toDate) {
      throw new ApiError(400, 'dateFrom must be less than or equal to dateTo', 'VALIDATION_ERROR');
    }
  }

  const filters = {
    userId: normalizedUserId,
    status: normalizedStatus,
    dateFrom: normalizedDateFrom,
    dateTo: normalizedDateTo
  };

  const [items, total] = await Promise.all([
    bookingRepository.listAllBookings({ ...filters, limit: safeLimit, offset }),
    bookingRepository.countAllBookings(filters)
  ]);

  return {
    items: items.map((row) => ({
      id: Number(row.id),
      userId: Number(row.user_id),
      userName: row.user_name,
      courtId: Number(row.court_id),
      slotId: Number(row.slot_id),
      date: row.booking_date,
      status: row.status,
      amountCents: Number(row.amount_cents),
      currency: row.currency,
      lockExpiresAt: row.lock_expires_at,
      confirmedAt: row.confirmed_at,
      cancelledAt: row.cancelled_at,
      courtName: row.court_name,
      slotLabel: row.slot_label,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
}

async function cancelBooking(currentUser, bookingId) {
  const parsedBookingId = Number(bookingId);
  const normalizedCurrentUserId = Number(currentUser.id);
  if (!Number.isInteger(parsedBookingId)) {
    throw new ApiError(400, 'booking id must be an integer', 'VALIDATION_ERROR');
  }

  if (!Number.isInteger(normalizedCurrentUserId)) {
    throw new ApiError(401, 'Invalid user context', 'UNAUTHORIZED');
  }

  let cancelledBooking;
  let lockKey;
  let lockToken;

  await withTransaction(async (client) => {
    const booking = await bookingRepository.findBookingByIdForUpdate(client, parsedBookingId);
    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (currentUser.role !== Role.ADMIN && Number(booking.user_id) !== normalizedCurrentUserId) {
      throw new ApiError(403, 'Cannot cancel another user booking', 'FORBIDDEN');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(409, 'Booking is already cancelled', 'BOOKING_ALREADY_CANCELLED');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ApiError(409, 'Completed booking cannot be cancelled', 'BOOKING_ALREADY_COMPLETED');
    }

    cancelledBooking = await bookingRepository.cancelBooking(client, parsedBookingId);
    lockKey = cancelledBooking.lock_key;
    lockToken = cancelledBooking.lock_token;
  });

  if (lockKey && lockToken) {
    await lockService.releaseLock(lockKey, lockToken);
  }

  emitSlotUpdated(toSlotUpdatedPayload(cancelledBooking));
  return toBookingResponse(cancelledBooking);
}

async function completeBooking(currentUser, bookingId) {
  const parsedBookingId = Number(bookingId);
  if (!Number.isInteger(parsedBookingId)) {
    throw new ApiError(400, 'booking id must be an integer', 'VALIDATION_ERROR');
  }

  if (currentUser.role !== Role.ADMIN) {
    throw new ApiError(403, 'Admin permission required', 'FORBIDDEN');
  }

  let completedBooking;
  let lockKey;
  let lockToken;

  await withTransaction(async (client) => {
    const booking = await bookingRepository.findBookingByIdForUpdate(client, parsedBookingId);
    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(409, 'Cancelled booking cannot be completed', 'BOOKING_ALREADY_CANCELLED');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ApiError(409, 'Booking is already completed', 'BOOKING_ALREADY_COMPLETED');
    }

    completedBooking = await bookingRepository.markBookingCompleted(client, parsedBookingId);
    lockKey = completedBooking.lock_key;
    lockToken = completedBooking.lock_token;

    const providerIntentId = `manual_${crypto.randomUUID().replace(/-/g, '')}`;
    await paymentRepository.upsertPaymentIntent(client, {
      bookingId: parsedBookingId,
      provider: 'manual_admin',
      providerIntentId,
      clientSecret: null,
      status: 'succeeded',
      amountCents: Number(booking.amount_cents),
      currency: booking.currency
    });
  });

  if (lockKey && lockToken) {
    await lockService.releaseLock(lockKey, lockToken);
  }

  emitSlotUpdated(toSlotUpdatedPayload(completedBooking));
  return toBookingResponse(completedBooking);
}

module.exports = {
  createBooking,
  getUserBookings,
  getAllBookings,
  cancelBooking,
  completeBooking,
  toSlotUpdatedPayload
};
