const { asyncHandler, sendSuccess } = require('../utils/response');
const userService = require('../services/user.service');

const getUsers = asyncHandler(async (_req, res) => {
  const users = await userService.listUsers();
  return sendSuccess(res, users, 'Users fetched successfully');
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUserByAdmin(req.body);
  return sendSuccess(res, user, 'User created successfully', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body);
  return sendSuccess(res, user, 'User updated successfully');
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.user, req.params.id);
  return sendSuccess(res, user, 'User deactivated successfully');
});

const updateRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole(req.user, req.params.id, req.body.role);
  return sendSuccess(res, user, 'User role updated successfully');
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateRole
};
