jest.mock('../src/services/analytics.service', () => ({
  getSummary: jest.fn(),
  getRevenue: jest.fn(),
  getPeakHours: jest.fn(),
  getUtilizationByCourt: jest.fn()
}));

jest.mock('../src/services/booking.service', () => ({
  getAllBookings: jest.fn()
}));

const analyticsService = require('../src/services/analytics.service');
const bookingService = require('../src/services/booking.service');
const adminOverviewService = require('../src/services/admin-overview.service');

describe('admin overview service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    analyticsService.getSummary.mockResolvedValue({
      totalRevenueVnd: 5400000,
      totalBookings: 48,
      activeUsers: 19,
      avgUtilizationPercent: 63.5
    });
    analyticsService.getRevenue.mockResolvedValue({
      dailySeries: [
        { date: '2026-05-01', revenueVnd: 200000 },
        { date: '2026-05-02', revenueVnd: 250000 },
        { date: '2026-05-03', revenueVnd: 300000 }
      ]
    });
    analyticsService.getPeakHours.mockResolvedValue([
      { hour: 18, bookingCount: 12 },
      { hour: 19, bookingCount: 15 }
    ]);
    analyticsService.getUtilizationByCourt.mockResolvedValue([
      { courtId: 1, courtName: 'Sân 1', utilizationPercent: 42.5, confirmedSlots: 34, totalAvailableSlots: 80 },
      { courtId: 2, courtName: 'Sân 2', utilizationPercent: 78.3, confirmedSlots: 47, totalAvailableSlots: 60 }
    ]);
    bookingService.getAllBookings.mockResolvedValue({
      items: [{ id: 1, courtName: 'Sân 1', status: 'CONFIRMED' }]
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  test('returns AI insights when AI service is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        strategy: 'admin_ml',
        summary: 'Nhu cầu tập trung mạnh vào khung 19:00.',
        recommendations: [
          {
            title: 'Mở rộng giờ cao điểm',
            priority: 'high',
            reason: 'Khung 19:00 đang chiếm nhu cầu cao nhất.',
            action: 'Mở thêm slot 19:00 cho sân công suất cao.'
          }
        ]
      })
    });

    const result = await adminOverviewService.getOverview({ id: 1, role: 'admin' });

    expect(result.aiInsights.status).toBe('ok');
    expect(result.aiInsights.strategy).toBe('admin_ml');
    expect(result.aiInsights.summary).toContain('19:00');
    expect(result.aiInsights.recommendations).toHaveLength(1);
    expect(result.recentBookings).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('falls back to local recommendations when AI service is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));

    const result = await adminOverviewService.getOverview({ id: 1, role: 'admin' });

    expect(result.aiInsights.status).toBe('unavailable');
    expect(result.aiInsights.strategy).toBe('fallback');
    expect(result.aiInsights.summary).toContain('48 đơn đặt sân');
    expect(result.aiInsights.recommendations.length).toBeGreaterThan(0);
    expect(result.alerts.length).toBeGreaterThan(0);
  });
});
