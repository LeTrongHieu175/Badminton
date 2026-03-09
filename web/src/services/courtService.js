import api from './api';
import { buildDailySlots, mockCourts } from './mockData';

export async function getCourts() {
  try {
    const response = await api.get('/courts');
    const payload = response.data.data || response.data;
    return payload.map((court) => ({
      id: Number(court.id),
      name: court.name,
      location: court.location,
      pricePerHour: Number(court.price_per_hour || court.pricePerHour || 12),
      status: court.status || (court.is_active ? 'ACTIVE' : 'INACTIVE')
    }));
  } catch (_error) {
    return mockCourts;
  }
}

export async function getCourtById(courtId) {
  const courts = await getCourts();
  return courts.find((court) => court.id === Number(courtId)) || null;
}

export async function getCourtAvailability(courtId, date) {
  try {
    const response = await api.get(`/courts/${courtId}/availability`, {
      params: { date }
    });

    const payload = response.data.data || response.data;

    return payload.slots.map((slot) => ({
      id: Number(slot.slot_id || slot.slotId),
      label: `${slot.start_time || slot.startTime} - ${slot.end_time || slot.endTime}`,
      startTime: slot.start_time || slot.startTime,
      endTime: slot.end_time || slot.endTime,
      status: slot.status,
      price: Number(slot.price_cents || slot.price || 1200) / (slot.price_cents ? 100 : 1)
    }));
  } catch (_error) {
    return buildDailySlots(Number(courtId), date);
  }
}
