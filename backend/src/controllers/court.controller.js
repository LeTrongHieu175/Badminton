const courtService = require('../services/court.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const getCourts = asyncHandler(async (_req, res) => {
  const courts = await courtService.getCourts();
  return sendSuccess(res, courts);
});

const getCourtById = asyncHandler(async (req, res) => {
  const court = await courtService.getCourtById(req.params.id);
  return sendSuccess(res, court);
});

const getCourtAvailability = asyncHandler(async (req, res) => {
  const result = await courtService.getCourtAvailability(req.params.id, req.query.date);
  return sendSuccess(res, result);
});

module.exports = {
  getCourts,
  getCourtById,
  getCourtAvailability
};
