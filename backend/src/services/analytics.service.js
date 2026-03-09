const ApiError = require('../utils/api-error');
const { assertISODate, dateDiffInDaysInclusive } = require('../utils/date-time');
const analyticsRepository = require('../repositories/analytics.repository');

function validateDateRange(startDate, endDate) {
  assertISODate(startDate, 'start_date');
  assertISODate(endDate, 'end_date');

  if (new Date(`${startDate}T00:00:00.000Z`) > new Date(`${endDate}T00:00:00.000Z`)) {
    throw new ApiError(400, 'start_date must be less than or equal to end_date', 'VALIDATION_ERROR');
  }
}

async function getRevenue({ startDate, endDate }) {
  validateDateRange(startDate, endDate);
  return analyticsRepository.getRevenueSummary(startDate, endDate);
}

async function getPeakHours({ startDate, endDate }) {
  validateDateRange(startDate, endDate);
  return analyticsRepository.getPeakHours(startDate, endDate);
}

async function getUtilization({ startDate, endDate }) {
  validateDateRange(startDate, endDate);

  const [confirmedCount, slotsPerDay] = await Promise.all([
    analyticsRepository.getConfirmedBookingCount(startDate, endDate),
    analyticsRepository.getActiveSlotsPerDay()
  ]);

  const days = dateDiffInDaysInclusive(startDate, endDate);
  const totalSlots = slotsPerDay * days;
  const utilizationRate = totalSlots === 0 ? 0 : confirmedCount / totalSlots;

  return {
    startDate,
    endDate,
    confirmedSlots: confirmedCount,
    totalAvailableSlots: totalSlots,
    utilizationRate,
    utilizationPercent: Number((utilizationRate * 100).toFixed(2))
  };
}

async function getTopUsers({ startDate, endDate, limit = 10 }) {
  validateDateRange(startDate, endDate);

  const parsedLimit = Number(limit);
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 10;

  return analyticsRepository.getTopUsersBySpend(startDate, endDate, safeLimit);
}

module.exports = {
  getRevenue,
  getPeakHours,
  getUtilization,
  getTopUsers
};
