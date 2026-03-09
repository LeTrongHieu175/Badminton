const { asyncHandler, sendSuccess } = require('../utils/response');
const userService = require('../services/user.service');

const getUsers = asyncHandler(async (_req, res) => {
  const users = await userService.listUsers();
  return sendSuccess(res, users, 'Users fetched successfully');
});

const updateRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole(req.user, req.params.id, req.body.role);
  return sendSuccess(res, user, 'User role updated successfully');
});

module.exports = {
  getUsers,
  updateRole
};
