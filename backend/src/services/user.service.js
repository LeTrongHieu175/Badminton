const ApiError = require('../utils/api-error');
const Role = require('../models/role');
const userRepository = require('../repositories/user.repository');
const { hashPassword } = require('../utils/password');

function toAdminView(user) {
  return {
    id: Number(user.id),
    username: user.username,
    fullName: user.full_name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[0-9+()-]{8,20}$/.test(phone);
}

function parseUserId(targetUserId) {
  const userId = Number(targetUserId);
  if (!Number.isInteger(userId)) {
    throw new ApiError(400, 'user id must be an integer', 'VALIDATION_ERROR');
  }

  return userId;
}

function normalizeRole(rawRole) {
  const normalizedRole = String(rawRole || '')
    .trim()
    .toLowerCase();

  if (!Object.values(Role).includes(normalizedRole)) {
    throw new ApiError(400, 'role must be admin or user', 'VALIDATION_ERROR');
  }

  return normalizedRole;
}

function parseOptionalBoolean(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new ApiError(400, `${fieldName} must be a boolean`, 'VALIDATION_ERROR');
}

async function assertUniqueIdentity({ username, email, phone, excludeUserId = null }) {
  if (username) {
    const existingByUsername = await userRepository.findByUsername(username);
    if (existingByUsername && existingByUsername.id !== excludeUserId) {
      throw new ApiError(409, 'Username already registered', 'USERNAME_EXISTS');
    }
  }

  if (email) {
    const existingByEmail = await userRepository.findByEmail(email);
    if (existingByEmail && existingByEmail.id !== excludeUserId) {
      throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
    }
  }

  if (phone) {
    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone && existingByPhone.id !== excludeUserId) {
      throw new ApiError(409, 'Phone already registered', 'PHONE_EXISTS');
    }
  }
}

async function assertAdminInvariant({ currentUser, targetUser, nextRole, nextIsActive }) {
  const targetIsActiveAdmin = targetUser.role === Role.ADMIN && targetUser.is_active;
  const willDeactivateOrDemote = nextRole !== Role.ADMIN || !nextIsActive;

  if (!targetIsActiveAdmin || !willDeactivateOrDemote) {
    return;
  }

  if (currentUser.id === targetUser.id && nextRole !== Role.ADMIN) {
    throw new ApiError(400, 'Cannot remove your own admin role', 'VALIDATION_ERROR');
  }

  const activeAdminCount = await userRepository.countByRole(Role.ADMIN, { activeOnly: true });
  if (activeAdminCount <= 1) {
    throw new ApiError(400, 'System must have at least one active admin', 'VALIDATION_ERROR');
  }
}

async function listUsers() {
  const users = await userRepository.listUsers({ includeInactive: true });
  return users.map(toAdminView);
}

async function createUserByAdmin(payload) {
  const normalizedUsername = normalizeString(payload.username);
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedFullName = normalizeString(payload.fullName || normalizedUsername) || normalizedUsername;
  const normalizedRole = payload.role ? normalizeRole(payload.role) : Role.USER;
  const password = String(payload.password || '');

  if (!normalizedUsername || !normalizedEmail || !normalizedPhone || !password) {
    throw new ApiError(400, 'username, email, phone, and password are required', 'VALIDATION_ERROR');
  }

  if (!validateEmail(normalizedEmail)) {
    throw new ApiError(400, 'email is invalid', 'VALIDATION_ERROR');
  }

  if (!validatePhone(normalizedPhone)) {
    throw new ApiError(400, 'phone must be 8-20 chars and only digits/+()/ -', 'VALIDATION_ERROR');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must have at least 6 characters', 'VALIDATION_ERROR');
  }

  await assertUniqueIdentity({ username: normalizedUsername, email: normalizedEmail, phone: normalizedPhone });

  const passwordHash = await hashPassword(password);
  const user = await userRepository.createUser({
    username: normalizedUsername,
    fullName: normalizedFullName,
    phone: normalizedPhone,
    email: normalizedEmail,
    passwordHash,
    role: normalizedRole,
    isActive: true
  });

  return toAdminView(user);
}

async function updateUser(currentUser, targetUserId, payload) {
  const userId = parseUserId(targetUserId);
  const targetUser = await userRepository.findByIdWithAuth(userId);

  if (!targetUser) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const updates = {};

  if (payload.username !== undefined) {
    const username = normalizeString(payload.username);
    if (!username) {
      throw new ApiError(400, 'username cannot be empty', 'VALIDATION_ERROR');
    }
    updates.username = username;
  }

  if (payload.fullName !== undefined) {
    const fullName = normalizeString(payload.fullName);
    if (!fullName) {
      throw new ApiError(400, 'fullName cannot be empty', 'VALIDATION_ERROR');
    }
    updates.fullName = fullName;
  }

  if (payload.email !== undefined) {
    const email = normalizeEmail(payload.email);
    if (!validateEmail(email)) {
      throw new ApiError(400, 'email is invalid', 'VALIDATION_ERROR');
    }
    updates.email = email;
  }

  if (payload.phone !== undefined) {
    const phone = normalizePhone(payload.phone);
    if (!validatePhone(phone)) {
      throw new ApiError(400, 'phone must be 8-20 chars and only digits/+()/ -', 'VALIDATION_ERROR');
    }
    updates.phone = phone;
  }

  if (payload.role !== undefined) {
    updates.role = normalizeRole(payload.role);
  }

  if (payload.isActive !== undefined) {
    updates.isActive = parseOptionalBoolean(payload.isActive, 'isActive');
  }

  if (payload.password !== undefined && payload.password !== null && String(payload.password) !== '') {
    const password = String(payload.password);
    if (password.length < 6) {
      throw new ApiError(400, 'Password must have at least 6 characters', 'VALIDATION_ERROR');
    }
    updates.passwordHash = await hashPassword(password);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields to update', 'VALIDATION_ERROR');
  }

  await assertUniqueIdentity({
    username: updates.username,
    email: updates.email,
    phone: updates.phone,
    excludeUserId: targetUser.id
  });

  const nextRole = updates.role || targetUser.role;
  const nextIsActive = updates.isActive === undefined ? targetUser.is_active : updates.isActive;

  await assertAdminInvariant({
    currentUser,
    targetUser,
    nextRole,
    nextIsActive
  });

  const updatedUser = await userRepository.updateUser(userId, updates);
  return toAdminView(updatedUser);
}

async function deactivateUser(currentUser, targetUserId) {
  const userId = parseUserId(targetUserId);
  const targetUser = await userRepository.findByIdWithAuth(userId);

  if (!targetUser) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  await assertAdminInvariant({
    currentUser,
    targetUser,
    nextRole: targetUser.role,
    nextIsActive: false
  });

  const updatedUser = await userRepository.updateUser(userId, { isActive: false });
  return toAdminView(updatedUser);
}

async function updateUserRole(currentUser, targetUserId, role) {
  return updateUser(currentUser, targetUserId, { role });
}

module.exports = {
  listUsers,
  createUserByAdmin,
  updateUser,
  deactivateUser,
  updateUserRole
};
