import api from './api';
import { mockUsers } from './mockData';

function normalizeUser(user) {
  return {
    id: Number(user.id),
    name: user.username || user.fullName || user.full_name || user.email,
    username: user.username || user.fullName || user.full_name || '',
    phone: user.phone || '',
    email: user.email,
    role: String(user.role || 'user').toLowerCase()
  };
}

function unwrapPayload(response) {
  return response?.data?.data || response?.data || {};
}

export async function getUsers() {
  try {
    const response = await api.get('/users');
    const payload = unwrapPayload(response);
    if (Array.isArray(payload)) {
      return payload.map(normalizeUser);
    }
    return [];
  } catch (_error) {
    return mockUsers.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.name,
      phone: user.phone || '',
      email: user.email,
      role: user.role
    }));
  }
}

export async function updateUserRole(userId, role) {
  const response = await api.patch(`/users/${userId}/role`, { role });
  const payload = unwrapPayload(response);
  return normalizeUser(payload);
}

export async function getProfile() {
  try {
    const response = await api.get('/auth/me');
    const payload = unwrapPayload(response);
    return normalizeUser(payload.user || payload);
  } catch (_error) {
    return {
      id: mockUsers[0].id,
      name: mockUsers[0].name,
      username: mockUsers[0].name,
      phone: mockUsers[0].phone || '',
      email: mockUsers[0].email,
      role: mockUsers[0].role
    };
  }
}
