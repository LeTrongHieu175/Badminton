import api, { unwrapPayload } from './api';

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

export async function registerUser({ username, email, phone, password }) {
  const response = await api.post('/auth/register', {
    username,
    email,
    mail: email,
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
