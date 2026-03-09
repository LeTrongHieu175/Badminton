const { withTransaction } = require('../config/db');
const { env } = require('../config/env');
const BookingStatus = require('../models/booking-status');
const Role = require('../models/role');
const ApiError = require('../utils/api-error');
const { assertISODate, addSeconds } = require('../utils/date-time');
const courtRepository = require('../repositories/court.repository');
const slotRepository = require('../repositories/slot.repository');
const bookingRepository = require('../repositories/booking.repository');
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
  if (!Number.isInteger(requestedUserId)) {
    throw new ApiError(400, 'user id must be an integer', 'VALIDATION_ERROR');
  }

  if (currentUser.role !== Role.ADMIN && currentUser.id !== requestedUserId) {
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

async function cancelBooking(currentUser, bookingId) {
  const parsedBookingId = Number(bookingId);
  if (!Number.isInteger(parsedBookingId)) {
    throw new ApiError(400, 'booking id must be an integer', 'VALIDATION_ERROR');
  }

  let cancelledBooking;
  let lockKey;
  let lockToken;

  await withTransaction(async (client) => {
    const booking = await bookingRepository.findBookingByIdForUpdate(client, parsedBookingId);
    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
    }

    if (currentUser.role !== Role.ADMIN && booking.user_id !== currentUser.id) {
      throw new ApiError(403, 'Cannot cancel another user booking', 'FORBIDDEN');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(409, 'Booking is already cancelled', 'BOOKING_ALREADY_CANCELLED');
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

module.exports = {
  createBooking,
  getUserBookings,
  cancelBooking,
  toSlotUpdatedPayload
};
