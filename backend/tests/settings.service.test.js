jest.mock('../src/repositories/settings.repository', () => ({
  ensureSettings: jest.fn(),
  updateSettings: jest.fn()
}));

const settingsRepository = require('../src/repositories/settings.repository');
const settingsService = require('../src/services/settings.service');

describe('settings.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns normalized settings', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      display_currency: 'USD',
      booking_hold_minutes: 15,
      updated_at: '2026-05-30T00:00:00.000Z'
    });

    const result = await settingsService.getSettings();

    expect(result).toEqual({
      displayCurrency: 'USD',
      bookingHoldMinutes: 15,
      updatedAt: '2026-05-30T00:00:00.000Z'
    });
  });

  test('rejects unsupported display currency', async () => {
    await expect(settingsService.updateSettings({ displayCurrency: 'JPY' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    });
  });

  test('updates validated settings', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      display_currency: 'VND',
      booking_hold_minutes: 10,
      updated_at: '2026-05-30T00:00:00.000Z'
    });
    settingsRepository.updateSettings.mockResolvedValue({
      display_currency: 'EUR',
      booking_hold_minutes: 20,
      updated_at: '2026-05-30T01:00:00.000Z'
    });

    const result = await settingsService.updateSettings({
      displayCurrency: 'eur',
      bookingHoldMinutes: 20
    });

    expect(settingsRepository.updateSettings).toHaveBeenCalledWith({
      displayCurrency: 'EUR',
      bookingHoldMinutes: 20
    });
    expect(result).toEqual({
      displayCurrency: 'EUR',
      bookingHoldMinutes: 20,
      updatedAt: '2026-05-30T01:00:00.000Z'
    });
  });
});
