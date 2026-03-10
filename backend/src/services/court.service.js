const ApiError = require('../utils/api-error');
const { assertISODate } = require('../utils/date-time');
const Role = require('../models/role');
const courtRepository = require('../repositories/court.repository');
const slotRepository = require('../repositories/slot.repository');

function toCourtView(court) {
  return {
    id: Number(court.id),
    name: court.name,
    location: court.location,
    isActive: Boolean(court.is_active),
    createdAt: court.created_at,
    updatedAt: court.updated_at
  };
}

function toSlotView(slot) {
  return {
    id: Number(slot.id),
    courtId: Number(slot.court_id),
    label: slot.label,
    startTime: slot.start_time,
    endTime: slot.end_time,
    priceCents: Number(slot.price_cents),
    isActive: Boolean(slot.is_active),
    createdAt: slot.created_at
  };
}

function parseCourtId(courtId) {
  const parsedCourtId = Number(courtId);
  if (!Number.isInteger(parsedCourtId)) {
    throw new ApiError(400, 'court id must be an integer', 'VALIDATION_ERROR');
  }
  return parsedCourtId;
}

function parseSlotId(slotId) {
  const parsedSlotId = Number(slotId);
  if (!Number.isInteger(parsedSlotId)) {
    throw new ApiError(400, 'slot id must be an integer', 'VALIDATION_ERROR');
  }
  return parsedSlotId;
}

function parseOptionalBoolean(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new ApiError(400, `${fieldName} must be a boolean`, 'VALIDATION_ERROR');
}

function normalizeString(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new ApiError(400, `${fieldName} cannot be empty`, 'VALIDATION_ERROR');
  }
  return normalized;
}

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || '').trim();
  return normalized || null;
}

function validateTimeString(value, fieldName) {
  const time = String(value || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new ApiError(400, `${fieldName} must be in HH:mm format`, 'VALIDATION_ERROR');
  }

  return time;
}

function parsePriceCents(value) {
  const priceCents = Number(value);
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new ApiError(400, 'priceCents must be a positive integer', 'VALIDATION_ERROR');
  }

  return priceCents;
}

function checkTimeRange(startTime, endTime) {
  if (startTime >= endTime) {
    throw new ApiError(400, 'endTime must be greater than startTime', 'VALIDATION_ERROR');
  }
}

function isAdminUser(user) {
  return user && user.role === Role.ADMIN;
}

async function getCourts(currentUser, { includeInactive }) {
  const requestedIncludeInactive = parseOptionalBoolean(includeInactive, 'includeInactive');
  const canIncludeInactive = isAdminUser(currentUser) && requestedIncludeInactive === true;

  const courts = await courtRepository.listCourts({ includeInactive: canIncludeInactive });
  return courts.map(toCourtView);
}

async function getCourtById(currentUser, courtId) {
  const parsedCourtId = parseCourtId(courtId);
  const court = await courtRepository.findCourtById(parsedCourtId);

  if (!court || (!court.is_active && !isAdminUser(currentUser))) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  const slots = await slotRepository.listSlotsByCourtId(parsedCourtId, {
    includeInactive: isAdminUser(currentUser)
  });

  return {
    ...toCourtView(court),
    slots: slots.map(toSlotView)
  };
}

async function getCourtAvailability(courtId, date) {
  const parsedCourtId = parseCourtId(courtId);
  const bookingDate = String(date || '').trim();

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

async function createCourt({ name, location }) {
  const court = await courtRepository.createCourt({
    name: normalizeString(name, 'name'),
    location: normalizeOptionalString(location)
  });

  return toCourtView(court);
}

async function updateCourt(courtId, payload) {
  const parsedCourtId = parseCourtId(courtId);
  const existingCourt = await courtRepository.findCourtById(parsedCourtId);

  if (!existingCourt) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  const updates = {};
  if (payload.name !== undefined) {
    updates.name = normalizeString(payload.name, 'name');
  }

  if (payload.location !== undefined) {
    updates.location = normalizeOptionalString(payload.location);
  }

  if (payload.isActive !== undefined) {
    updates.isActive = parseOptionalBoolean(payload.isActive, 'isActive');
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields to update', 'VALIDATION_ERROR');
  }

  const court = await courtRepository.updateCourt(parsedCourtId, updates);
  return toCourtView(court);
}

async function deleteCourt(courtId) {
  const parsedCourtId = parseCourtId(courtId);
  const existingCourt = await courtRepository.findCourtById(parsedCourtId);

  if (!existingCourt) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  const court = await courtRepository.deactivateCourt(parsedCourtId);
  return toCourtView(court);
}

async function createCourtSlot(courtId, payload) {
  const parsedCourtId = parseCourtId(courtId);
  const court = await courtRepository.findCourtById(parsedCourtId);

  if (!court) {
    throw new ApiError(404, 'Court not found', 'COURT_NOT_FOUND');
  }

  const startTime = validateTimeString(payload.startTime, 'startTime');
  const endTime = validateTimeString(payload.endTime, 'endTime');
  checkTimeRange(startTime, endTime);

  try {
    const slot = await slotRepository.createSlot({
      courtId: parsedCourtId,
      label: normalizeOptionalString(payload.label),
      startTime,
      endTime,
      priceCents: parsePriceCents(payload.priceCents)
    });

    return toSlotView(slot);
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Slot time range already exists for this court', 'SLOT_CONFLICT');
    }

    if (error.code === '23514') {
      throw new ApiError(400, 'Invalid slot data', 'VALIDATION_ERROR');
    }

    throw error;
  }
}

async function updateCourtSlot(courtId, slotId, payload) {
  const parsedCourtId = parseCourtId(courtId);
  const parsedSlotId = parseSlotId(slotId);

  const existingSlot = await slotRepository.findSlotByIdAndCourt(parsedSlotId, parsedCourtId);
  if (!existingSlot) {
    throw new ApiError(404, 'Slot not found for this court', 'SLOT_NOT_FOUND');
  }

  const updates = {};
  if (payload.label !== undefined) {
    updates.label = normalizeOptionalString(payload.label);
  }

  if (payload.startTime !== undefined) {
    updates.startTime = validateTimeString(payload.startTime, 'startTime');
  }

  if (payload.endTime !== undefined) {
    updates.endTime = validateTimeString(payload.endTime, 'endTime');
  }

  if (updates.startTime || updates.endTime) {
    checkTimeRange(updates.startTime || existingSlot.start_time, updates.endTime || existingSlot.end_time);
  }

  if (payload.priceCents !== undefined) {
    updates.priceCents = parsePriceCents(payload.priceCents);
  }

  if (payload.isActive !== undefined) {
    updates.isActive = parseOptionalBoolean(payload.isActive, 'isActive');
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields to update', 'VALIDATION_ERROR');
  }

  try {
    const slot = await slotRepository.updateSlot(parsedSlotId, parsedCourtId, updates);
    return toSlotView(slot);
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Slot time range already exists for this court', 'SLOT_CONFLICT');
    }

    if (error.code === '23514') {
      throw new ApiError(400, 'Invalid slot data', 'VALIDATION_ERROR');
    }

    throw error;
  }
}

async function deleteCourtSlot(courtId, slotId) {
  const parsedCourtId = parseCourtId(courtId);
  const parsedSlotId = parseSlotId(slotId);

  const existingSlot = await slotRepository.findSlotByIdAndCourt(parsedSlotId, parsedCourtId);
  if (!existingSlot) {
    throw new ApiError(404, 'Slot not found for this court', 'SLOT_NOT_FOUND');
  }

  const slot = await slotRepository.deactivateSlot(parsedSlotId, parsedCourtId);
  return toSlotView(slot);
}

module.exports = {
  getCourts,
  getCourtById,
  getCourtAvailability,
  createCourt,
  updateCourt,
  deleteCourt,
  createCourtSlot,
  updateCourtSlot,
  deleteCourtSlot
};
