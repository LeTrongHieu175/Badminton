const courtService = require('../services/court.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const getCourts = asyncHandler(async (req, res) => {
  const courts = await courtService.getCourts(req.user, {
    includeInactive: req.query.includeInactive
  });

  return sendSuccess(res, courts);
});

const getCourtById = asyncHandler(async (req, res) => {
  const court = await courtService.getCourtById(req.user, req.params.id);
  return sendSuccess(res, court);
});

const getCourtAvailability = asyncHandler(async (req, res) => {
  const result = await courtService.getCourtAvailability(req.params.id, req.query.date);
  return sendSuccess(res, result);
});

const createCourt = asyncHandler(async (req, res) => {
  const court = await courtService.createCourt(req.body);
  return sendSuccess(res, court, 'Court created successfully', 201);
});

const updateCourt = asyncHandler(async (req, res) => {
  const court = await courtService.updateCourt(req.params.id, req.body);
  return sendSuccess(res, court, 'Court updated successfully');
});

const deleteCourt = asyncHandler(async (req, res) => {
  const court = await courtService.deleteCourt(req.params.id);
  return sendSuccess(res, court, 'Court deleted successfully');
});

const createCourtSlot = asyncHandler(async (req, res) => {
  const slot = await courtService.createCourtSlot(req.params.id, req.body);
  return sendSuccess(res, slot, 'Court slot created successfully', 201);
});

const updateCourtSlot = asyncHandler(async (req, res) => {
  const slot = await courtService.updateCourtSlot(req.params.id, req.params.slotId, req.body);
  return sendSuccess(res, slot, 'Court slot updated successfully');
});

const deleteCourtSlot = asyncHandler(async (req, res) => {
  const slot = await courtService.deleteCourtSlot(req.params.id, req.params.slotId);
  return sendSuccess(res, slot, 'Court slot deleted successfully');
});

module.exports = {
  getCourts,
  getCourtById,
  getCourtAvailability,
  createCourt,
  updateCourt,
  deleteCourt,
  createCourtSlot,
  updateCourtSlot,
  deleteCourtSlot
};
