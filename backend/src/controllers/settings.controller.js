const settingsService = require('../services/settings.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const getSettings = asyncHandler(async (_req, res) => {
  const settings = await settingsService.getSettings();
  return sendSuccess(res, settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  return sendSuccess(res, settings, 'Settings updated successfully');
});

module.exports = {
  getSettings,
  updateSettings
};
