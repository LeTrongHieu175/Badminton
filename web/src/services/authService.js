import api from './api';

function unwrapPayload(response) {
  return response?.data?.data || response?.data || {};
}

export async function loginUser({ identifier, password }) {
  const response = await api.post('/auth/login', {
    identifier,
    password
  });

  const payload = unwrapPayload(response);
  return {
    user: payload.user,
    accessToken: payload.accessToken
  };
}

export async function registerUser({ username, mail, phone, password }) {
  const response = await api.post('/auth/register', {
    username,
    mail,
    phone,
    password
  });

  const payload = unwrapPayload(response);
  return {
    user: payload.user,
    accessToken: payload.accessToken
  };
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  const payload = unwrapPayload(response);
  return payload.user;
}
