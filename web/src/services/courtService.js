import api, { unwrapPayload } from './api';

function normalizeCourt(court) {
  return {
    id: Number(court.id),
    name: court.name,
    location: court.location || '',
    isActive: Boolean(court.isActive ?? court.is_active),
    createdAt: court.createdAt || court.created_at,
    updatedAt: court.updatedAt || court.updated_at,
    slots: Array.isArray(court.slots)
      ? court.slots.map((slot) => ({
          id: Number(slot.id),
          courtId: Number(slot.courtId ?? slot.court_id),
          label: slot.label || '',
          startTime: slot.startTime || slot.start_time,
          endTime: slot.endTime || slot.end_time,
          priceCents: Number(slot.priceCents ?? slot.price_cents ?? 0),
          isActive: Boolean(slot.isActive ?? slot.is_active)
        }))
      : []
  };
}

export async function getCourts({ includeInactive = false } = {}) {
  const response = await api.get('/courts', {
    params: includeInactive ? { includeInactive: true } : undefined
  });

  const payload = unwrapPayload(response);
  return Array.isArray(payload) ? payload.map(normalizeCourt) : [];
}

export async function getCourtById(courtId) {
  const response = await api.get(`/courts/${courtId}`);
  return normalizeCourt(unwrapPayload(response));
}

export async function getCourtAvailability(courtId, date) {
  const response = await api.get(`/courts/${courtId}/availability`, {
    params: { date }
  });

  const payload = unwrapPayload(response);

  return (payload.slots || []).map((slot) => ({
    id: Number(slot.slotId ?? slot.slot_id),
    label: slot.label || `${slot.startTime || slot.start_time} - ${slot.endTime || slot.end_time}`,
    startTime: slot.startTime || slot.start_time,
    endTime: slot.endTime || slot.end_time,
    status: slot.status,
    priceCents: Number(slot.priceCents ?? slot.price_cents ?? 0),
    bookingId: slot.bookingId ?? slot.booking_id ?? null,
    lockExpiresAt: slot.lockExpiresAt ?? slot.lock_expires_at ?? null
  }));
}

export async function getCourtRecommendations(date) {
  const response = await api.get('/recommendations/courts', {
    params: { date }
  });

  const payload = unwrapPayload(response);
  return {
    recommendedSlots: Array.isArray(payload.recommendedSlots)
      ? payload.recommendedSlots.map((slot) => ({
          courtId: Number(slot.courtId),
          courtName: slot.courtName,
          location: slot.location,
          slotId: Number(slot.slotId),
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label,
          priceCents: Number(slot.priceCents)
        }))
      : [],
    recommendedCourtIds: Array.isArray(payload.recommendedCourtIds)
      ? payload.recommendedCourtIds.map((id) => Number(id))
      : [],
    aiStatus: payload.aiStatus || 'unavailable'
  };
}

export async function createCourt(payload) {
  const response = await api.post('/courts', payload);
  return normalizeCourt(unwrapPayload(response));
}

export async function updateCourt(courtId, payload) {
  const response = await api.patch(`/courts/${courtId}`, payload);
  return normalizeCourt(unwrapPayload(response));
}

export async function deleteCourt(courtId) {
  const response = await api.delete(`/courts/${courtId}`);
  return normalizeCourt(unwrapPayload(response));
}

export async function createCourtSlot(courtId, payload) {
  const response = await api.post(`/courts/${courtId}/slots`, payload);
  const slot = unwrapPayload(response);

  return {
    id: Number(slot.id),
    courtId: Number(slot.courtId ?? slot.court_id),
    label: slot.label || '',
    startTime: slot.startTime || slot.start_time,
    endTime: slot.endTime || slot.end_time,
    priceCents: Number(slot.priceCents ?? slot.price_cents),
    isActive: Boolean(slot.isActive ?? slot.is_active)
  };
}

export async function updateCourtSlot(courtId, slotId, payload) {
  const response = await api.patch(`/courts/${courtId}/slots/${slotId}`, payload);
  const slot = unwrapPayload(response);

  return {
    id: Number(slot.id),
    courtId: Number(slot.courtId ?? slot.court_id),
    label: slot.label || '',
    startTime: slot.startTime || slot.start_time,
    endTime: slot.endTime || slot.end_time,
    priceCents: Number(slot.priceCents ?? slot.price_cents),
    isActive: Boolean(slot.isActive ?? slot.is_active)
  };
}

export async function deleteCourtSlot(courtId, slotId) {
  const response = await api.delete(`/courts/${courtId}/slots/${slotId}`);
  const slot = unwrapPayload(response);

  return {
    id: Number(slot.id),
    courtId: Number(slot.courtId ?? slot.court_id),
    label: slot.label || '',
    startTime: slot.startTime || slot.start_time,
    endTime: slot.endTime || slot.end_time,
    priceCents: Number(slot.priceCents ?? slot.price_cents),
    isActive: Boolean(slot.isActive ?? slot.is_active)
  };
}
