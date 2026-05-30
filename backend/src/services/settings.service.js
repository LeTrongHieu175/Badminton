const { env } = require('../config/env');
const settingsRepository = require('../repositories/settings.repository');
const ApiError = require('../utils/api-error');

const SUPPORTED_DISPLAY_CURRENCIES = ['VND', 'USD', 'EUR'];

function getDefaultSettings() {
  const normalizedCurrency = String(env.DEFAULT_CURRENCY || 'VND').toUpperCase();

  return {
    displayCurrency: SUPPORTED_DISPLAY_CURRENCIES.includes(normalizedCurrency) ? normalizedCurrency : 'VND',
    bookingHoldMinutes: Math.max(1, Math.floor(env.BOOKING_LOCK_TTL_SECONDS / 60) || 10)
  };
}

function normalizeSettings(row) {
  const fallback = getDefaultSettings();

  return {
    displayCurrency: row?.display_currency || fallback.displayCurrency,
    bookingHoldMinutes: Number(row?.booking_hold_minutes || fallback.bookingHoldMinutes),
    updatedAt: row?.updated_at || null
  };
}

async function getSettings() {
  const defaults = getDefaultSettings();
  const row = await settingsRepository.ensureSettings(defaults);
  return normalizeSettings(row);
}

async function getBookingHoldSeconds() {
  const settings = await getSettings();
  return settings.bookingHoldMinutes * 60;
}

async function updateSettings(payload = {}) {
  const updates = {};

  if (payload.displayCurrency !== undefined) {
    const normalizedCurrency = String(payload.displayCurrency || '')
      .trim()
      .toUpperCase();

    if (!SUPPORTED_DISPLAY_CURRENCIES.includes(normalizedCurrency)) {
      throw new ApiError(
        400,
        `displayCurrency must be one of: ${SUPPORTED_DISPLAY_CURRENCIES.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    updates.displayCurrency = normalizedCurrency;
  }

  if (payload.bookingHoldMinutes !== undefined) {
    const parsedMinutes = Number(payload.bookingHoldMinutes);
    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 120) {
      throw new ApiError(400, 'bookingHoldMinutes must be an integer between 1 and 120', 'VALIDATION_ERROR');
    }

    updates.bookingHoldMinutes = parsedMinutes;
  }

  await settingsRepository.ensureSettings(getDefaultSettings());
  const row = await settingsRepository.updateSettings(updates);
  return normalizeSettings(row);
}

module.exports = {
  SUPPORTED_DISPLAY_CURRENCIES,
  getSettings,
  getBookingHoldSeconds,
  updateSettings
};
