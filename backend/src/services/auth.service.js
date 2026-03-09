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
    createdAt: user.created_at
  };
}

function normalizePhone(phone) {
  return String(phone || '').trim().replace(/\s+/g, '');
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

async function register({ username, fullName, email, mail, phone, password }) {
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = resolveEmail({ email, mail });
  const normalizedPhone = normalizePhone(phone);
  const normalizedFullName = String(fullName || normalizedUsername).trim() || normalizedUsername;

  if (!normalizedUsername || !normalizedEmail || !normalizedPhone || !password) {
    throw new ApiError(400, 'username, mail, phone, and password are required', 'VALIDATION_ERROR');
  }

  if (!validateEmail(normalizedEmail)) {
    throw new ApiError(400, 'mail is invalid', 'VALIDATION_ERROR');
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

  return {
    user: toPublicUser(user)
  };
}

module.exports = {
  register,
  login,
  getCurrentUser
};
