const SYSTEM_SETTINGS_STORAGE_KEY = 'smart-badminton-system-settings';

const DEFAULT_SYSTEM_SETTINGS = {
  displayCurrency: 'VND',
  bookingHoldMinutes: 10,
  updatedAt: null
};

let runtimeSettings = DEFAULT_SYSTEM_SETTINGS;

function normalizeSystemSettings(input) {
  return {
    displayCurrency: String(input?.displayCurrency || DEFAULT_SYSTEM_SETTINGS.displayCurrency).toUpperCase(),
    bookingHoldMinutes: Number(input?.bookingHoldMinutes || DEFAULT_SYSTEM_SETTINGS.bookingHoldMinutes),
    updatedAt: input?.updatedAt || null
  };
}

export function getDefaultSystemSettings() {
  return DEFAULT_SYSTEM_SETTINGS;
}

export function getStoredSystemSettings() {
  if (typeof window === 'undefined') {
    return runtimeSettings;
  }

  try {
    const raw = window.localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return runtimeSettings;
    }

    return normalizeSystemSettings(JSON.parse(raw));
  } catch (_error) {
    return runtimeSettings;
  }
}

export function getRuntimeSystemSettings() {
  return runtimeSettings;
}

export function setRuntimeSystemSettings(settings) {
  runtimeSettings = normalizeSystemSettings(settings);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(runtimeSettings));
  }

  return runtimeSettings;
}

runtimeSettings = getStoredSystemSettings();
