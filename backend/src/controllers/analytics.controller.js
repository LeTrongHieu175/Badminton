const analyticsService = require('../services/analytics.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const getRevenue = asyncHandler(async (req, res) => {
  const result = await analyticsService.getRevenue({
    startDate: req.query.start_date,
    endDate: req.query.end_date
  });

  return sendSuccess(res, result);
});

const getPeakHours = asyncHandler(async (req, res) => {
  const result = await analyticsService.getPeakHours({
    startDate: req.query.start_date,
    endDate: req.query.end_date
  });

  return sendSuccess(res, result);
});

const getUtilization = asyncHandler(async (req, res) => {
  const result = await analyticsService.getUtilization({
    startDate: req.query.start_date,
    endDate: req.query.end_date
  });

  return sendSuccess(res, result);
});

const getTopUsers = asyncHandler(async (req, res) => {
  const result = await analyticsService.getTopUsers({
    startDate: req.query.start_date,
    endDate: req.query.end_date,
    limit: req.query.limit
  });

  return sendSuccess(res, result);
});

module.exports = {
  getRevenue,
  getPeakHours,
  getUtilization,
  getTopUsers
};
