const bookingRepository = require('../src/repositories/booking.repository');
const recommendationService = require('../src/services/recommendation.service');
const slotRepository = require('../src/repositories/slot.repository');

jest.mock('../src/repositories/slot.repository');
jest.mock('../src/repositories/booking.repository');

describe('recommendation service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  test('returns ranked court-time recommendations from AI response', async () => {
    bookingRepository.listRecommendationHistoryByUserId.mockResolvedValue([
      {
        court_id: 1,
        court_name: 'Court A',
        booking_date: '2026-03-01',
        start_time: '19:00',
        end_time: '20:00',
        price_vnd: 120000
      }
    ]);

    slotRepository.listAvailableSlotsByDate.mockResolvedValue([
      {
        court_id: 1,
        court_name: 'Court A',
        court_location: 'Location A',
        slot_id: 11,
        label: 'Evening',
        start_time: '19:00',
        end_time: '20:00',
        price_vnd: 120000,
        status: 'AVAILABLE'
      },
      {
        court_id: 2,
        court_name: 'Court B',
        court_location: 'Location B',
        slot_id: 22,
        label: 'Prime',
        start_time: '17:00',
        end_time: '18:00',
        price_vnd: 100000,
        status: 'AVAILABLE'
      }
    ]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        strategy: 'personalized',
        recommendedOptions: [
          {
            courtId: 1,
            slotId: 11,
            score: 0.91,
            reason: 'Bạn thường chơi Court A trong khung giờ 19:00 - 20:00.'
          },
          {
            courtId: 2,
            slotId: 22,
            score: 0.44,
            reason: 'Khung giờ 17:00 - 18:00 là lựa chọn dự phòng.'
          }
        ]
      })
    });

    const result = await recommendationService.getRecommendedCourts({ id: 7 }, { date: '2026-03-10' });

    expect(result.aiStatus).toBe('ok');
    expect(result.strategy).toBe('personalized');
    expect(result.recommendedCourtIds).toEqual([1, 2]);
    expect(result.recommendedOptions).toEqual([
      expect.objectContaining({
        courtId: 1,
        slotId: 11,
        label: '19:00 - 20:00',
        score: 0.91
      }),
      expect.objectContaining({
        courtId: 2,
        slotId: 22,
        label: '17:00 - 18:00',
        score: 0.44
      })
    ]);
  });

  test('falls back to local ranking when AI service is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    slotRepository.listAvailableSlotsByDate.mockResolvedValue([
      {
        court_id: 1,
        court_name: 'Court A',
        court_location: 'Location A',
        slot_id: 11,
        start_time: '19:00',
        end_time: '20:00',
        price_vnd: 120000,
        status: 'AVAILABLE'
      },
      {
        court_id: 1,
        court_name: 'Court A',
        court_location: 'Location A',
        slot_id: 12,
        start_time: '17:00',
        end_time: '18:00',
        price_vnd: 110000,
        status: 'AVAILABLE'
      },
      {
        court_id: 2,
        court_name: 'Court B',
        court_location: 'Location B',
        slot_id: 21,
        start_time: '19:00',
        end_time: '20:00',
        price_vnd: 115000,
        status: 'AVAILABLE'
      }
    ]);

    bookingRepository.listRecommendationHistoryByUserId.mockResolvedValue([
      {
        court_id: 1,
        court_name: 'Court A',
        booking_date: '2026-03-03',
        start_time: '19:00',
        end_time: '20:00',
        price_vnd: 120000
      },
      {
        court_id: 1,
        court_name: 'Court A',
        booking_date: '2026-03-01',
        start_time: '19:00',
        end_time: '20:00',
        price_vnd: 120000
      },
      {
        court_id: 1,
        court_name: 'Court A',
        booking_date: '2026-02-25',
        start_time: '17:00',
        end_time: '18:00',
        price_vnd: 110000
      }
    ]);

    const result = await recommendationService.getRecommendedCourts({ id: 7 }, { date: '2026-03-10' });

    expect(result.aiStatus).toBe('unavailable');
    expect(result.strategy).toBe('fallback');
    expect(result.recommendedOptions.map((option) => `${option.courtName}:${option.label}`)).toEqual([
      'Court A:19:00 - 20:00',
      'Court A:17:00 - 18:00',
      'Court B:19:00 - 20:00'
    ]);
    expect(result.recommendedOptions[0].reason).toContain('2 lần');
  });
});
