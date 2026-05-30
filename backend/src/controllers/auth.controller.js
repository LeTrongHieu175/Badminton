const authService = require('../services/auth.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendSuccess(res, result, 'User registered successfully', 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, result, 'Login successful');
});

const me = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentUser(req.user.id);
  return sendSuccess(res, result, 'User profile fetched');
});

const updateMe = asyncHandler(async (req, res) => {
  const result = await authService.updateCurrentUser(req.user.id, req.body);
  return sendSuccess(res, result, 'User profile updated successfully');
});

module.exports = {
  register,
  login,
  me,
  updateMe
};
