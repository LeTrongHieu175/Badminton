const recommendationService = require('../src/services/recommendation.service');
const slotRepository = require('../src/repositories/slot.repository');

jest.mock('../src/repositories/slot.repository');

describe('recommendation service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  test('returns recommended courts from AI slots and available slot data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recommended_slots: ['18:00', '19:00'] })
    });

    slotRepository.listAvailableSlotsByDate.mockResolvedValue([
      {
        court_id: 1,
        court_name: 'Court A',
        court_location: 'Location A',
        slot_id: 11,
        label: 'Evening',
        start_time: '18:00',
        end_time: '19:00',
        price_cents: 1200,
        status: 'AVAILABLE'
      },
      {
        court_id: 2,
        court_name: 'Court B',
        court_location: 'Location B',
        slot_id: 22,
        label: 'Prime',
        start_time: '19:00',
        end_time: '20:00',
        price_cents: 1800,
        status: 'LOCKED'
      }
    ]);

    const result = await recommendationService.getRecommendedCourts(
      { id: 7 },
      { date: '2026-03-10' }
    );

    expect(result.aiStatus).toBe('ok');
    expect(result.recommendedCourtIds).toEqual([1]);
    expect(result.recommendedSlots).toHaveLength(1);
    expect(result.recommendedSlots[0]).toMatchObject({
      courtId: 1,
      slotId: 11,
      startTime: '18:00'
    });
  });

  test('gracefully degrades when AI service is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    slotRepository.listAvailableSlotsByDate.mockResolvedValue([]);

    const result = await recommendationService.getRecommendedCourts(
      { id: 7 },
      { date: '2026-03-10' }
    );

    expect(result.aiStatus).toBe('unavailable');
    expect(result.recommendedCourtIds).toEqual([]);
    expect(result.recommendedSlots).toEqual([]);
  });
});
