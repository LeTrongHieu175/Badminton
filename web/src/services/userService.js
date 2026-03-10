import api, { unwrapPayload } from './api';

function normalizeUser(user) {
  return {
    id: Number(user.id),
    name: user.fullName || user.full_name || user.username || user.email,
    username: user.username || '',
    fullName: user.fullName || user.full_name || '',
    phone: user.phone || '',
    email: user.email || '',
    role: String(user.role || 'user').toLowerCase(),
    isActive: Boolean(user.isActive ?? user.is_active ?? true),
    createdAt: user.createdAt || user.created_at,
    updatedAt: user.updatedAt || user.updated_at
  };
}

export async function getUsers() {
  const response = await api.get('/users');
  const payload = unwrapPayload(response);
  return Array.isArray(payload) ? payload.map(normalizeUser) : [];
}

export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return normalizeUser(unwrapPayload(response));
}

export async function updateUser(userId, payload) {
  const response = await api.patch(`/users/${userId}`, payload);
  return normalizeUser(unwrapPayload(response));
}

export async function deactivateUser(userId) {
  const response = await api.delete(`/users/${userId}`);
  return normalizeUser(unwrapPayload(response));
}

export async function updateUserRole(userId, role) {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return normalizeUser(unwrapPayload(response));
}

export async function getProfile() {
  const response = await api.get('/auth/me');
  const payload = unwrapPayload(response);
  return normalizeUser(payload.user || payload);
}
