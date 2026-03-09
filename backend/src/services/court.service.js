const ApiError = require('../utils/api-error');
const { assertISODate } = require('../utils/date-time');
const courtRepository = require('../repositories/court.repository');
const slotRepository = require('../repositories/slot.repository');

async function getCourts() {
  return courtRepository.listCourts();
}

async function getCourtById(courtId) {
  const parsedCourtId = Number(courtId);
  if (!Number.isInteger(parsedCourtId)) {
    throw new ApiError(400, 'court id must be an integer', 'VALIDATION_ERROR');
  }

  const court = await courtRepository.findCourtById(parsedCourtId);
  if (!court) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  return court;
}

async function getCourtAvailability(courtId, date) {
  const parsedCourtId = Number(courtId);
  const bookingDate = String(date || '').trim();

  if (!Number.isInteger(parsedCourtId)) {
    throw new ApiError(400, 'court id must be an integer', 'VALIDATION_ERROR');
  }

  assertISODate(bookingDate, 'date');

  const court = await courtRepository.findCourtById(parsedCourtId);
  if (!court || !court.is_active) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  const slots = await slotRepository.listCourtAvailability(parsedCourtId, bookingDate);

  return {
    court: {
      id: Number(court.id),
      name: court.name,
      location: court.location,
      isActive: court.is_active
    },
    date: bookingDate,
    slots: slots.map((slot) => ({
      slotId: Number(slot.slot_id),
      label: slot.label,
      startTime: slot.start_time,
      endTime: slot.end_time,
      priceCents: Number(slot.price_cents),
      status: slot.status,
      bookingId: slot.booking_id ? Number(slot.booking_id) : null,
      lockExpiresAt: slot.lock_expires_at
    }))
  };
}

module.exports = {
  getCourts,
  getCourtById,
  getCourtAvailability
};
