const { env } = require('../config/env');
const analyticsRepository = require('../repositories/analytics.repository');
const analyticsService = require('./analytics.service');
const bookingService = require('./booking.service');

const AI_TIMEOUT_MS = 1500;
const RECENT_BOOKINGS_LIMIT = 10;
const MAX_RECOMMENDATIONS = 4;

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getCurrentYearRange(now = new Date()) {
  const year = now.getUTCFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: formatDateOnly(now)
  };
}

function getCurrentMonthRange(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return {
    startDate: `${year}-${month}-01`,
    endDate: formatDateOnly(now)
  };
}

function getTodayRange(now = new Date()) {
  const today = formatDateOnly(now);
  return {
    startDate: today,
    endDate: today
  };
}

function getLast30DaysRange(now = new Date()) {
  return {
    startDate: formatDateOnly(shiftDate(now, -29)),
    endDate: formatDateOnly(now)
  };
}

function getLast12MonthsRange(now = new Date()) {
  const endDate = formatDateOnly(now);
  const startAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  startAnchor.setUTCMonth(startAnchor.getUTCMonth() - 11);

  return {
    startDate: formatDateOnly(startAnchor),
    endDate
  };
}

function toHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function calculateRevenueTrend(revenueSeries) {
  if (!Array.isArray(revenueSeries) || revenueSeries.length === 0) {
    return {
      direction: 'stable',
      currentWindowRevenueVnd: 0,
      previousWindowRevenueVnd: 0,
      changePercent: 0
    };
  }

  const windowSize = Math.min(7, revenueSeries.length);
  const currentWindow = revenueSeries.slice(-windowSize);
  const previousWindow = revenueSeries.slice(-windowSize * 2, -windowSize);
  const currentWindowRevenueVnd = currentWindow.reduce((sum, item) => sum + Number(item.revenueVnd || 0), 0);
  const previousWindowRevenueVnd = previousWindow.reduce((sum, item) => sum + Number(item.revenueVnd || 0), 0);
  const base = previousWindowRevenueVnd > 0 ? previousWindowRevenueVnd : Math.max(currentWindowRevenueVnd, 1);
  const rawChange = base > 0 ? ((currentWindowRevenueVnd - previousWindowRevenueVnd) / base) * 100 : 0;
  const changePercent = Number(rawChange.toFixed(1));

  let direction = 'stable';
  if (changePercent >= 8) {
    direction = 'up';
  } else if (changePercent <= -8) {
    direction = 'down';
  }

  return {
    direction,
    currentWindowRevenueVnd,
    previousWindowRevenueVnd,
    changePercent
  };
}

function buildAlerts({ peakHours, utilization, revenueTrend }) {
  const alerts = [];
  const topHour = [...peakHours].sort((left, right) => Number(right.bookingCount || 0) - Number(left.bookingCount || 0))[0];
  const weakestCourt = [...utilization].sort(
    (left, right) => Number(left.utilizationPercent || 0) - Number(right.utilizationPercent || 0)
  )[0];
  const strongestCourt = [...utilization].sort(
    (left, right) => Number(right.utilizationPercent || 0) - Number(left.utilizationPercent || 0)
  )[0];

  if (topHour && Number(topHour.bookingCount || 0) > 0) {
    alerts.push({
      type: 'peak_hour',
      severity: 'high',
      title: 'Giờ cao điểm cần theo dõi',
      message: `${toHourLabel(topHour.hour)} đang có nhu cầu cao nhất với ${topHour.bookingCount} lượt đặt.`
    });
  }

  if (weakestCourt) {
    alerts.push({
      type: 'low_utilization',
      severity: Number(weakestCourt.utilizationPercent || 0) < 35 ? 'high' : 'medium',
      title: 'Sân cần kích cầu',
      message: `${weakestCourt.courtName} hiện có công suất ${Number(weakestCourt.utilizationPercent || 0).toFixed(1)}%.`
    });
  }

  if (strongestCourt) {
    alerts.push({
      type: 'high_utilization',
      severity: Number(strongestCourt.utilizationPercent || 0) >= 70 ? 'medium' : 'low',
      title: 'Sân có tín hiệu mở rộng',
      message: `${strongestCourt.courtName} đang dẫn đầu với công suất ${Number(strongestCourt.utilizationPercent || 0).toFixed(1)}%.`
    });
  }

  if (revenueTrend.direction === 'down') {
    alerts.push({
      type: 'revenue_down',
      severity: 'high',
      title: 'Doanh thu đang giảm',
      message: `Doanh thu 7 ngày gần nhất giảm ${Math.abs(revenueTrend.changePercent)}% so với giai đoạn liền trước.`
    });
  } else if (revenueTrend.direction === 'up') {
    alerts.push({
      type: 'revenue_up',
      severity: 'low',
      title: 'Doanh thu tăng tích cực',
      message: `Doanh thu 7 ngày gần nhất tăng ${revenueTrend.changePercent}% so với giai đoạn liền trước.`
    });
  }

  return alerts;
}

function buildFallbackSummary({ stats, alerts }) {
  const firstAlert = alerts[0]?.message;
  if (firstAlert) {
    return `Hệ thống đang ghi nhận ${stats.totalBookings} đơn đặt sân, doanh thu ${stats.totalRevenueVnd} VND. ${firstAlert}`;
  }

  return `Hệ thống đang ghi nhận ${stats.totalBookings} đơn đặt sân và doanh thu ${stats.totalRevenueVnd} VND trong toàn bộ kỳ dữ liệu.`;
}

function buildFallbackRecommendations({ alerts, utilization, peakHours, revenueTrend }) {
  const recommendations = [];
  const weakestCourt = [...utilization].sort(
    (left, right) => Number(left.utilizationPercent || 0) - Number(right.utilizationPercent || 0)
  )[0];
  const strongestCourt = [...utilization].sort(
    (left, right) => Number(right.utilizationPercent || 0) - Number(left.utilizationPercent || 0)
  )[0];
  const topHour = [...peakHours].sort((left, right) => Number(right.bookingCount || 0) - Number(left.bookingCount || 0))[0];

  if (weakestCourt) {
    recommendations.push({
      title: 'Kích cầu sân công suất thấp',
      priority: Number(weakestCourt.utilizationPercent || 0) < 35 ? 'high' : 'medium',
      reason: `${weakestCourt.courtName} đang là sân có tỷ lệ sử dụng thấp nhất.`,
      action: `Tạo ưu đãi cho ${weakestCourt.courtName} vào các khung giờ thấp điểm trong tuần tới.`
    });
  }

  if (topHour) {
    recommendations.push({
      title: 'Tối ưu giờ cao điểm',
      priority: 'high',
      reason: `${toHourLabel(topHour.hour)} là khung giờ có nhu cầu đặt sân cao nhất.`,
      action: `Xem xét mở thêm slot hoặc tăng cường vận hành quanh ${toHourLabel(topHour.hour)}.`
    });
  }

  if (strongestCourt) {
    recommendations.push({
      title: 'Mở rộng sân hiệu suất cao',
      priority: Number(strongestCourt.utilizationPercent || 0) >= 70 ? 'medium' : 'low',
      reason: `${strongestCourt.courtName} đang có hiệu suất tốt nhất trong hệ thống.`,
      action: `Ưu tiên hiển thị ${strongestCourt.courtName} và đánh giá khả năng mở rộng khung giờ.`
    });
  }

  if (revenueTrend.direction === 'down') {
    recommendations.push({
      title: 'Chặn đà giảm doanh thu',
      priority: 'high',
      reason: `Doanh thu 7 ngày gần nhất đang giảm ${Math.abs(revenueTrend.changePercent)}%.`,
      action: 'Kiểm tra tỷ lệ lấp đầy theo ngày và triển khai khuyến mãi ngắn hạn cho các khung giờ trống.'
    });
  }

  if (recommendations.length === 0 && alerts[0]) {
    recommendations.push({
      title: alerts[0].title,
      priority: alerts[0].severity,
      reason: alerts[0].message,
      action: 'Tiếp tục theo dõi thêm dữ liệu trong các chu kỳ tiếp theo.'
    });
  }

  return recommendations.slice(0, MAX_RECOMMENDATIONS);
}

function normalizeRecommendation(item, index) {
  return {
    title: String(item?.title || `Khuyến nghị ${index + 1}`).trim(),
    priority: ['high', 'medium', 'low'].includes(String(item?.priority || '').toLowerCase())
      ? String(item.priority).toLowerCase()
      : 'medium',
    reason: String(item?.reason || '').trim(),
    action: String(item?.action || '').trim()
  };
}

async function fetchAiInsights(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.AI_SERVICE_BASE_URL}/ai/admin-insights`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return {
        status: 'unavailable',
        strategy: 'fallback',
        summary: '',
        recommendations: []
      };
    }

    const rawPayload = await response.json();
    return {
      status: 'ok',
      strategy: String(rawPayload?.strategy || 'ai_service'),
      summary: String(rawPayload?.summary || '').trim(),
      recommendations: Array.isArray(rawPayload?.recommendations)
        ? rawPayload.recommendations.map(normalizeRecommendation).filter((item) => item.reason && item.action)
        : []
    };
  } catch (_error) {
    return {
      status: 'unavailable',
      strategy: 'fallback',
      summary: '',
      recommendations: []
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getOverview(currentUser) {
  const now = new Date();
  const yearRange = getCurrentYearRange(now);
  const monthRange = getCurrentMonthRange(now);
  const todayRange = getTodayRange(now);
  const last30DaysRange = getLast30DaysRange(now);
  const last12MonthsRange = getLast12MonthsRange(now);

  const [
    stats,
    revenueYearToDate,
    revenueMonthToDate,
    revenueToday,
    revenueLast30Days,
    revenueLast12Months,
    utilizationLast30Days,
    peakHours,
    utilizationByCourt,
    recentBookingPayload
  ] = await Promise.all([
    analyticsService.getSummary(),
    analyticsService.getRevenue(yearRange),
    analyticsService.getRevenue(monthRange),
    analyticsService.getRevenue(todayRange),
    analyticsService.getRevenue(last30DaysRange),
    analyticsRepository.getMonthlyRevenueSeries(last12MonthsRange.startDate, last12MonthsRange.endDate),
    analyticsRepository.getDailyUtilizationSeries(last30DaysRange.startDate, last30DaysRange.endDate),
    analyticsService.getPeakHours(last30DaysRange),
    analyticsService.getUtilizationByCourt(),
    bookingService.getAllBookings(currentUser, { page: 1, limit: RECENT_BOOKINGS_LIMIT })
  ]);

  const revenueTrend = calculateRevenueTrend(revenueLast30Days.dailySeries);
  const avgUtilizationLast30Days =
    utilizationLast30Days.length > 0
      ? utilizationLast30Days.reduce((sum, item) => sum + Number(item.utilizationPercent || 0), 0) /
        utilizationLast30Days.length
      : 0;
  const alerts = buildAlerts({
    peakHours,
    utilization: utilizationByCourt,
    revenueTrend
  });

  const aiPayload = {
    stats,
    revenueSeries: revenueLast30Days.dailySeries,
    peakHours,
    utilizationByCourt,
    alerts,
    revenueTrend
  };
  const aiResult = await fetchAiInsights(aiPayload);

  const fallbackRecommendations = buildFallbackRecommendations({
    alerts,
    utilization: utilizationByCourt,
    peakHours,
    revenueTrend
  });

  return {
    stats: {
      ...stats,
      totalRevenueVnd: revenueYearToDate.totalRevenueVnd,
      revenueTodayVnd: revenueToday.totalRevenueVnd,
      revenueMonthToDateVnd: revenueMonthToDate.totalRevenueVnd,
      revenueYearToDateVnd: revenueYearToDate.totalRevenueVnd,
      revenueAllTimeVnd: Number(stats.totalRevenueVnd || 0),
      avgUtilizationLast30DaysPercent: Number(avgUtilizationLast30Days.toFixed(2))
    },
    charts: {
      revenue: revenueLast30Days.dailySeries,
      revenueByMonth: revenueLast12Months,
      utilizationSeries: utilizationLast30Days,
      peakHours,
      utilizationByCourt
    },
    alerts,
    aiInsights: {
      status: aiResult.status,
      strategy: aiResult.strategy,
      generatedAt: new Date().toISOString(),
      summary: aiResult.summary || buildFallbackSummary({ stats, alerts }),
      recommendations: aiResult.recommendations.length > 0 ? aiResult.recommendations : fallbackRecommendations
    },
    recentBookings: recentBookingPayload.items
  };
}

module.exports = {
  getOverview
};
