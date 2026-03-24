import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const campaignApi = {
  /** Fire-and-forget: results stream over WebSocket /ws */
  run:  (data) => api.post('/api/run', data),
  list: ()     => api.get('/api/campaigns'),
  get:  (id)   => api.get(`/api/campaigns/${id}`),
};

export const logsApi = {
  getAll:   (params) => api.get('/api/logs', { params }),
  getStats: ()       => api.get('/api/logs/stats'),
};

export const reviewApi = {
  getPending: ()             => api.get('/api/review'),
  decide:     (id, decision) => api.post(`/api/review/${id}/${decision}`),
};

export const approvalLogApi = {
  getAll: (params) => api.get('/api/approval-logs', { params }),
};

export const settingsApi = {
  list:   ()                       => api.get('/api/settings/credentials'),
  get:    (platform)               => api.get(`/api/settings/credentials/${platform}`),
  save:   (platform, payload)      => api.put(`/api/settings/credentials/${platform}`, payload),
  remove: (platform)               => api.delete(`/api/settings/credentials/${platform}`),
  test:   (platform)               => api.post(`/api/settings/credentials/${platform}/test`),
};

export default api;
