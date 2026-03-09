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

module.exports = {
  register,
  login,
  me
};
