import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('smart-badminton-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function unwrapPayload(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export default api;
