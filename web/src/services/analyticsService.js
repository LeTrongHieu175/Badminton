import api, { unwrapPayload } from './api';

function getDefaultRange() {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
}

export async function getDashboardSummary() {
  const response = await api.get('/analytics/summary');
  const payload = unwrapPayload(response);

  return {
    totalRevenueCents: Number(payload.totalRevenueCents || 0),
    totalBookings: Number(payload.totalBookings || 0),
    activeUsers: Number(payload.activeUsers || 0),
    avgUtilizationPercent: Number(payload.avgUtilizationPercent || 0)
  };
}

export async function getRevenueSeries({ startDate, endDate } = {}) {
  const range = {
    ...getDefaultRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {})
  };

  const response = await api.get('/analytics/revenue', {
    params: {
      start_date: range.startDate,
      end_date: range.endDate
    }
  });

  const payload = unwrapPayload(response);
  return Array.isArray(payload?.dailySeries)
    ? payload.dailySeries.map((item) => ({
        period: item.date,
        revenueCents: Number(item.revenueCents || 0)
      }))
    : [];
}

export async function getPeakHoursSeries({ startDate, endDate } = {}) {
  const range = {
    ...getDefaultRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {})
  };

  const response = await api.get('/analytics/peak-hours', {
    params: {
      start_date: range.startDate,
      end_date: range.endDate
    }
  });

  const payload = unwrapPayload(response);
  return Array.isArray(payload)
    ? payload.map((item) => ({
        hour: `${String(item.hour).padStart(2, '0')}:00`,
        demand: Number(item.bookingCount || item.booking_count || 0)
      }))
    : [];
}

export async function getUtilizationByCourt() {
  const response = await api.get('/analytics/utilization-by-court');
  const payload = unwrapPayload(response);

  return Array.isArray(payload)
    ? payload.map((item) => ({
        courtId: Number(item.courtId || item.court_id),
        court: item.courtName || item.court_name,
        usage: Number(item.utilizationPercent || 0),
        confirmedSlots: Number(item.confirmedSlots || 0),
        totalAvailableSlots: Number(item.totalAvailableSlots || 0)
      }))
    : [];
}
