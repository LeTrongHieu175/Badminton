import api from './api';
import {
  mockPeakHours,
  mockRecentBookings,
  mockRevenueSeries,
  mockStats,
  mockUtilization
} from './mockData';

export async function getRevenueSeries() {
  try {
    const response = await api.get('/analytics/revenue', {
      params: { start_date: '2026-01-01', end_date: '2026-12-31' }
    });

    const payload = response.data.data;
    if (!payload?.dailySeries) {
      return mockRevenueSeries;
    }

    return payload.dailySeries.map((entry) => ({
      period: entry.date,
      revenue: Math.round(Number(entry.revenueCents || 0) / 100)
    }));
  } catch (_error) {
    return mockRevenueSeries;
  }
}

export async function getUtilizationSeries() {
  try {
    const response = await api.get('/analytics/utilization', {
      params: { start_date: '2026-01-01', end_date: '2026-12-31' }
    });

    if (response?.data) {
      return mockUtilization;
    }

    return mockUtilization;
  } catch (_error) {
    return mockUtilization;
  }
}

export async function getPeakHoursSeries() {
  try {
    const response = await api.get('/analytics/peak-hours', {
      params: { start_date: '2026-01-01', end_date: '2026-12-31' }
    });

    if (Array.isArray(response.data.data) && response.data.data.length > 0) {
      return response.data.data.map((entry) => ({
        hour: `${String(entry.hour).padStart(2, '0')}:00`,
        demand: entry.bookingCount
      }));
    }

    return mockPeakHours;
  } catch (_error) {
    return mockPeakHours;
  }
}

export async function getDashboardStats() {
  try {
    const [revenue, utilization] = await Promise.all([getRevenueSeries(), getUtilizationSeries()]);

    const totalRevenue = revenue.reduce((sum, item) => sum + item.revenue, 0);
    const avgUtilization =
      utilization.length > 0
        ? utilization.reduce((sum, item) => sum + item.usage, 0) / utilization.length
        : 0;

    return {
      totalRevenue,
      totalBookings: mockStats.totalBookings,
      activeUsers: mockStats.activeUsers,
      avgUtilization
    };
  } catch (_error) {
    return mockStats;
  }
}

export async function getRecentBookings() {
  return mockRecentBookings;
}
