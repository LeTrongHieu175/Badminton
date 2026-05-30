import api, { unwrapPayload } from './api';

function normalizeSettings(payload) {
  return {
    displayCurrency: String(payload?.displayCurrency || 'VND').toUpperCase(),
    bookingHoldMinutes: Number(payload?.bookingHoldMinutes || 10),
    updatedAt: payload?.updatedAt || null
  };
}

export async function getSystemSettings() {
  const response = await api.get('/settings');
  return normalizeSettings(unwrapPayload(response));
}

export async function updateSystemSettings(payload) {
  const response = await api.patch('/settings', payload);
  return normalizeSettings(unwrapPayload(response));
}
