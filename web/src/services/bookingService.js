import api, { unwrapPayload } from './api';

function normalizeBooking(booking) {
  const amountCents = Number(booking.amountCents ?? booking.amount_cents ?? 0);

  return {
    id: Number(booking.id),
    userId: Number(booking.userId ?? booking.user_id),
    userName: booking.userName || booking.user_name || '',
    courtId: Number(booking.courtId ?? booking.court_id),
    slotId: Number(booking.slotId ?? booking.slot_id),
    bookingDate: booking.date || booking.booking_date,
    courtName: booking.courtName || booking.court_name || '-',
    slotLabel:
      booking.slotLabel ||
      booking.slot_label ||
      `${booking.startTime || booking.start_time || '--:--'} - ${booking.endTime || booking.end_time || '--:--'}`,
    startTime: booking.startTime || booking.start_time,
    endTime: booking.endTime || booking.end_time,
    status: booking.status,
    amountCents,
    amount: amountCents / 100,
    currency: booking.currency,
    lockExpiresAt: booking.lockExpiresAt || booking.lock_expires_at,
    confirmedAt: booking.confirmedAt || booking.confirmed_at,
    cancelledAt: booking.cancelledAt || booking.cancelled_at,
    createdAt: booking.createdAt || booking.created_at,
    updatedAt: booking.updatedAt || booking.updated_at
  };
}

export async function getUserBookings(userId, { page = 1, limit = 20 } = {}) {
  const response = await api.get(`/bookings/user/${userId}`, {
    params: {
      page,
      limit
    }
  });

  const payload = unwrapPayload(response);
  return {
    items: Array.isArray(payload.items) ? payload.items.map(normalizeBooking) : [],
    pagination: payload.pagination || {
      page,
      limit,
      total: 0,
      totalPages: 0
    }
  };
}

export async function getAllBookings({ userId, status, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
  const response = await api.get('/bookings', {
    params: {
      userId,
      status,
      dateFrom,
      dateTo,
      page,
      limit
    }
  });

  const payload = unwrapPayload(response);

  return {
    items: Array.isArray(payload.items) ? payload.items.map(normalizeBooking) : [],
    pagination: payload.pagination || {
      page,
      limit,
      total: 0,
      totalPages: 0
    }
  };
}

export async function createBooking({ courtId, slotId, date }) {
  const response = await api.post('/bookings', {
    courtId,
    slotId,
    date
  });

  return normalizeBooking(unwrapPayload(response));
}

export async function cancelBooking(bookingId) {
  const response = await api.delete(`/bookings/${bookingId}`);
  return normalizeBooking(unwrapPayload(response));
}

export async function completeBooking(bookingId) {
  const response = await api.patch(`/bookings/${bookingId}/complete`);
  return normalizeBooking(unwrapPayload(response));
}
