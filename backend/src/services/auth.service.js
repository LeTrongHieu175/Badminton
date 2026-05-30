const ApiError = require('../utils/api-error');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const Role = require('../models/role');

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at
  };
}

function normalizePhone(phone) {
  return String(phone || '').trim().replace(/\s+/g, '');
}

function normalizeString(value) {
  return String(value || '').trim();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveEmail({ email, mail }) {
  return String(email || mail || '').trim().toLowerCase();
}

function resolveIdentifier({ identifier, username, email, mail }) {
  return String(identifier || username || email || mail || '').trim().toLowerCase();
}

async function assertUniqueProfile({ username, phone, excludeUserId }) {
  if (username) {
    const existingByUsername = await userRepository.findByUsername(username);
    if (existingByUsername && Number(existingByUsername.id) !== Number(excludeUserId)) {
      throw new ApiError(409, 'Username already registered', 'USERNAME_EXISTS');
    }
  }

  if (phone) {
    const existingPhone = await userRepository.findByPhone(phone);
    if (existingPhone && Number(existingPhone.id) !== Number(excludeUserId)) {
      throw new ApiError(409, 'Phone already registered', 'PHONE_EXISTS');
    }
  }
}

async function register({ username, fullName, email, mail, phone, password }) {
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = resolveEmail({ email, mail });
  const normalizedPhone = normalizePhone(phone);
  const normalizedFullName = String(fullName || normalizedUsername).trim() || normalizedUsername;

  if (!normalizedUsername || !normalizedEmail || !normalizedPhone || !password) {
    throw new ApiError(400, 'username, email, phone, and password are required', 'VALIDATION_ERROR');
  }

  if (!validateEmail(normalizedEmail)) {
    throw new ApiError(400, 'email is invalid', 'VALIDATION_ERROR');
  }

  if (!/^[0-9+()-]{8,20}$/.test(normalizedPhone)) {
    throw new ApiError(400, 'phone must be 8-20 chars and only digits/+()/ -', 'VALIDATION_ERROR');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must have at least 6 characters', 'VALIDATION_ERROR');
  }

  const existingByUsername = await userRepository.findByUsername(normalizedUsername);
  if (existingByUsername) {
    throw new ApiError(409, 'Username already registered', 'USERNAME_EXISTS');
  }

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const existingPhone = await userRepository.findByPhone(normalizedPhone);
  if (existingPhone) {
    throw new ApiError(409, 'Phone already registered', 'PHONE_EXISTS');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.createUser({
    username: normalizedUsername,
    fullName: normalizedFullName,
    phone: normalizedPhone,
    email: normalizedEmail,
    passwordHash,
    role: Role.USER
  });

  const accessToken = signAccessToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  });

  return {
    user: toPublicUser(user),
    accessToken
  };
}

async function login({ identifier, username, email, mail, password }) {
  const normalizedIdentifier = resolveIdentifier({ identifier, username, email, mail });

  if (!normalizedIdentifier || !password) {
    throw new ApiError(400, 'identifier and password are required', 'VALIDATION_ERROR');
  }

  const user = await userRepository.findByEmailOrUsername(normalizedIdentifier);
  if (!user) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const validPassword = await comparePassword(password, user.password_hash);
  if (!validPassword) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'User account is deactivated', 'USER_DEACTIVATED');
  }

  const accessToken = signAccessToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  });

  return {
    user: toPublicUser(user),
    accessToken
  };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'User account is deactivated', 'USER_DEACTIVATED');
  }

  return {
    user: toPublicUser(user)
  };
}

async function updateCurrentUser(userId, payload) {
  const user = await userRepository.findByIdWithAuth(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'User account is deactivated', 'USER_DEACTIVATED');
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

  if (payload.phone !== undefined) {
    const phone = normalizePhone(payload.phone);
    if (!/^[0-9+()-]{8,20}$/.test(phone)) {
      throw new ApiError(400, 'phone must be 8-20 chars and only digits/+()/ -', 'VALIDATION_ERROR');
    }
    updates.phone = phone;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields to update', 'VALIDATION_ERROR');
  }

  await assertUniqueProfile({
    username: updates.username,
    phone: updates.phone,
    excludeUserId: user.id
  });

  const updatedUser = await userRepository.updateUser(user.id, updates);

  return {
    user: toPublicUser(updatedUser)
  };
}

async function changeCurrentUserPassword(userId, payload) {
  const user = await userRepository.findByIdWithAuth(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'User account is deactivated', 'USER_DEACTIVATED');
  }

  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  const confirmPassword = String(payload.confirmPassword || '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, 'currentPassword, newPassword, and confirmPassword are required', 'VALIDATION_ERROR');
  }

  const validPassword = await comparePassword(currentPassword, user.password_hash);
  if (!validPassword) {
    throw new ApiError(401, 'Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must have at least 6 characters', 'VALIDATION_ERROR');
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'Password confirmation does not match', 'VALIDATION_ERROR');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from current password', 'VALIDATION_ERROR');
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepository.updateUser(user.id, { passwordHash });

  return {
    success: true
  };
}

module.exports = {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  changeCurrentUserPassword
};
