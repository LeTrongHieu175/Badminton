const adminOverviewService = require('../services/admin-overview.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const getOverview = asyncHandler(async (req, res) => {
  const result = await adminOverviewService.getOverview(req.user);
  return sendSuccess(res, result);
});

module.exports = {
  getOverview
};
