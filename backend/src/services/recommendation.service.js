const { env } = require('../config/env');
const { assertISODate, formatTimeHHmm } = require('../utils/date-time');
const slotRepository = require('../repositories/slot.repository');

function normalizeHour(value) {
  const normalized = String(value || '').trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return normalized;
  }

  const firstMatch = normalized.match(/([01]\d|2[0-3]):[0-5]\d/);
  return firstMatch ? firstMatch[0] : null;
}

async function fetchRecommendedSlots(userId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${env.AI_SERVICE_BASE_URL}/ai/recommendation/${userId}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return {
        slots: [],
        status: 'unavailable'
      };
    }

    const payload = await response.json();
    const rawSlots = Array.isArray(payload?.recommended_slots) ? payload.recommended_slots : [];
    const slots = rawSlots.map(normalizeHour).filter(Boolean);

    return {
      slots,
      status: 'ok'
    };
  } catch (_error) {
    return {
      slots: [],
      status: 'unavailable'
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getRecommendedCourts(currentUser, { date }) {
  const bookingDate = String(date || '').trim();
  assertISODate(bookingDate, 'date');

  const aiResult = await fetchRecommendedSlots(currentUser.id);
  const availableSlots = await slotRepository.listAvailableSlotsByDate(bookingDate);
  const recommendedSlotSet = new Set(aiResult.slots);

  const recommendedSlots = availableSlots
    .filter((slot) => slot.status === 'AVAILABLE' && recommendedSlotSet.has(normalizeHour(slot.start_time)))
    .map((slot) => ({
      courtId: Number(slot.court_id),
      courtName: slot.court_name,
      location: slot.court_location,
      slotId: Number(slot.slot_id),
      label: slot.label,
      startTime: formatTimeHHmm(slot.start_time),
      endTime: formatTimeHHmm(slot.end_time),
      priceVnd: Number(slot.price_vnd)
    }));

  const recommendedCourtIds = [...new Set(recommendedSlots.map((slot) => slot.courtId))];

  return {
    date: bookingDate,
    recommendedSlots,
    recommendedCourtIds,
    aiStatus: aiResult.status
  };
}

module.exports = {
  getRecommendedCourts
};
