const ApiError = require('../utils/api-error');
const Role = require('../models/role');
const userRepository = require('../repositories/user.repository');

function toAdminView(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

async function listUsers() {
  const users = await userRepository.listUsers();
  return users.map(toAdminView);
}

async function updateUserRole(currentUser, targetUserId, role) {
  const userId = Number(targetUserId);
  if (!Number.isInteger(userId)) {
    throw new ApiError(400, 'user id must be an integer', 'VALIDATION_ERROR');
  }

  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!Object.values(Role).includes(normalizedRole)) {
    throw new ApiError(400, 'role must be admin or user', 'VALIDATION_ERROR');
  }

  if (currentUser.id === userId && normalizedRole !== Role.ADMIN) {
    throw new ApiError(400, 'Cannot remove your own admin role', 'VALIDATION_ERROR');
  }

  const targetUser = await userRepository.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (targetUser.role === Role.ADMIN && normalizedRole === Role.USER) {
    const adminCount = await userRepository.countByRole(Role.ADMIN);
    if (adminCount <= 1) {
      throw new ApiError(400, 'System must have at least one admin', 'VALIDATION_ERROR');
    }
  }

  const updatedUser = await userRepository.updateUserRole(userId, normalizedRole);
  return toAdminView(updatedUser);
}

module.exports = {
  listUsers,
  updateUserRole
};
