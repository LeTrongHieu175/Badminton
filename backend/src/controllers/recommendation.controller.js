const recommendationService = require('../services/recommendation.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const getRecommendedCourts = asyncHandler(async (req, res) => {
  const result = await recommendationService.getRecommendedCourts(req.user, {
    date: req.query.date
  });

  return sendSuccess(res, result);
});

module.exports = {
  getRecommendedCourts
};
