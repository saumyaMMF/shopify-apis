import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

export const api = axios.create({
  baseURL: '/api/backend',
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        const r = await axios.post('/api/backend/auth/refresh', null, { withCredentials: true });
        useAuthStore.getState().setAuth(r.data.accessToken, r.data.user);
        err.config.headers.Authorization = `Bearer ${r.data.accessToken}`;
        return axios(err.config);
      } catch {
        useAuthStore.getState().clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
