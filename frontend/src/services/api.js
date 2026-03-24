import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const campaignApi = {
  run: (data) => api.post('/api/campaigns/run', data),
  list: () => api.get('/api/campaigns'),
  get: (id) => api.get(`/api/campaigns/${id}`),
};

export const logsApi = {
  getAll: (params) => api.get('/api/logs', { params }),
  getStats: () => api.get('/api/logs/stats'),
};

export default api;
