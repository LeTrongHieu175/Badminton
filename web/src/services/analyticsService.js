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
    totalRevenueVnd: Number(payload.totalRevenueVnd || 0),
    totalBookings: Number(payload.totalBookings || 0),
    activeUsers: Number(payload.activeUsers || 0),
    avgUtilizationPercent: Number(payload.avgUtilizationPercent || 0)
  };
}

function normalizeOverviewRecommendation(item) {
  return {
    title: item.title || 'Khuyến nghị vận hành',
    priority: item.priority || 'medium',
    reason: item.reason || '',
    action: item.action || ''
  };
}

function normalizeOverviewBooking(booking) {
  const amountVnd = Number(booking.amountVnd ?? booking.amount_vnd ?? 0);
  const refundAmountVnd = booking.refundAmountVnd ?? booking.refund_amount_vnd;

  return {
    id: Number(booking.id),
    userId: Number(booking.userId ?? booking.user_id),
    userName: booking.userName || booking.user_name || '',
    courtId: Number(booking.courtId ?? booking.court_id),
    slotId: Number(booking.slotId ?? booking.slot_id),
    bookingDate: booking.bookingDate || booking.date || booking.booking_date,
    courtName: booking.courtName || booking.court_name || '-',
    slotLabel:
      booking.slotLabel ||
      booking.slot_label ||
      `${booking.startTime || booking.start_time || '--:--'} - ${booking.endTime || booking.end_time || '--:--'}`,
    startTime: booking.startTime || booking.start_time,
    endTime: booking.endTime || booking.end_time,
    status: booking.status,
    amountVnd,
    refundAmountVnd: refundAmountVnd === undefined || refundAmountVnd === null ? null : Number(refundAmountVnd),
    currency: booking.currency,
    lockExpiresAt: booking.lockExpiresAt || booking.lock_expires_at,
    confirmedAt: booking.confirmedAt || booking.confirmed_at,
    cancelledAt: booking.cancelledAt || booking.cancelled_at,
    refundedAt: booking.refundedAt || booking.refunded_at,
    createdAt: booking.createdAt || booking.created_at,
    updatedAt: booking.updatedAt || booking.updated_at
  };
}

export async function getAdminOverview() {
  const response = await api.get('/analytics/overview');
  const payload = unwrapPayload(response);

  return {
    stats: {
      totalRevenueVnd: Number(payload?.stats?.totalRevenueVnd || 0),
      revenueTodayVnd: Number(payload?.stats?.revenueTodayVnd || 0),
      revenueMonthToDateVnd: Number(payload?.stats?.revenueMonthToDateVnd || 0),
      revenueYearToDateVnd: Number(payload?.stats?.revenueYearToDateVnd || 0),
      revenueAllTimeVnd: Number(payload?.stats?.revenueAllTimeVnd || 0),
      totalBookings: Number(payload?.stats?.totalBookings || 0),
      activeUsers: Number(payload?.stats?.activeUsers || 0),
      avgUtilizationPercent: Number(payload?.stats?.avgUtilizationPercent || 0),
      avgUtilizationLast30DaysPercent: Number(payload?.stats?.avgUtilizationLast30DaysPercent || 0)
    },
    charts: {
      revenue: Array.isArray(payload?.charts?.revenue)
        ? payload.charts.revenue.map((item) => ({
            period: item.date,
            revenueVnd: Number(item.revenueVnd || 0)
          }))
        : [],
      revenueByMonth: Array.isArray(payload?.charts?.revenueByMonth)
        ? payload.charts.revenueByMonth.map((item) => ({
            period: item.month,
            revenueVnd: Number(item.revenueVnd || 0)
          }))
        : [],
      utilizationSeries: Array.isArray(payload?.charts?.utilizationSeries)
        ? payload.charts.utilizationSeries.map((item) => ({
            period: item.date,
            usage: Number(item.utilizationPercent || 0),
            confirmedSlots: Number(item.confirmedSlots || 0),
            totalAvailableSlots: Number(item.totalAvailableSlots || 0)
          }))
        : [],
      peakHours: Array.isArray(payload?.charts?.peakHours)
        ? payload.charts.peakHours.map((item) => ({
            hour: `${String(item.hour).padStart(2, '0')}:00`,
            demand: Number(item.bookingCount || 0)
          }))
        : [],
      utilization: Array.isArray(payload?.charts?.utilizationByCourt)
        ? payload.charts.utilizationByCourt.map((item) => ({
            courtId: Number(item.courtId || item.court_id),
            court: item.courtName || item.court_name,
            usage: Number(item.utilizationPercent || 0),
            confirmedSlots: Number(item.confirmedSlots || 0),
            totalAvailableSlots: Number(item.totalAvailableSlots || 0)
          }))
        : []
    },
    alerts: Array.isArray(payload?.alerts) ? payload.alerts : [],
    aiInsights: {
      status: payload?.aiInsights?.status || 'unavailable',
      strategy: payload?.aiInsights?.strategy || 'fallback',
      generatedAt: payload?.aiInsights?.generatedAt || null,
      summary: payload?.aiInsights?.summary || '',
      recommendations: Array.isArray(payload?.aiInsights?.recommendations)
        ? payload.aiInsights.recommendations.map(normalizeOverviewRecommendation)
        : []
    },
    recentBookings: Array.isArray(payload?.recentBookings) ? payload.recentBookings.map(normalizeOverviewBooking) : []
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
        revenueVnd: Number(item.revenueVnd || 0)
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
