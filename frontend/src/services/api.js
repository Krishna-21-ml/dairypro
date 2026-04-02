import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// FIX: Zustand persist stores token inside 'auth-storage' as JSON,
// but also writes to 'token' key directly via login().
// Read from both locations so it works in all cases.
function getToken() {
  // First try the direct key set by login()
  const direct = localStorage.getItem('token');
  if (direct) return direct;

  // Fallback: read from Zustand persist storage
  try {
    const zustand = localStorage.getItem('auth-storage');
    if (zustand) {
      const parsed = JSON.parse(zustand);
      return parsed?.state?.token || null;
    }
  } catch {}
  return null;
}

// Request interceptor - attach JWT
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || '';
    const isAuthError =
      status === 401 ||
      (status === 403 && detail.toLowerCase().includes('not authenticated'));

    if (isAuthError) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/users/me'),
};

// ── Farmers ───────────────────────────────────────────────────────────────────
export const farmersAPI = {
  list: (params) => api.get('/farmers', { params }),
  create: (data) => api.post('/farmers', data),
  get: (id) => api.get(`/farmers/${id}`),
  update: (id, data) => api.put(`/farmers/${id}`, data),
  delete: (id) => api.delete(`/farmers/${id}`),
  summary: (id, params) => api.get(`/farmers/${id}/summary`, { params }),
};

// ── Milk Entries ──────────────────────────────────────────────────────────────
export const milkAPI = {
  list: (params) => api.get('/milk-entries', { params }),
  create: (data) => api.post('/milk-entries', data),
  bulkCreate: (entries) => api.post('/milk-entries/bulk', entries),
  dailySummary: (params) => api.get('/milk-entries/daily-summary', { params }),
  delete: (id) => api.delete(`/milk-entries/${id}`),
};

// ── Milk Prices ───────────────────────────────────────────────────────────────
export const pricesAPI = {
  current: () => api.get('/milk-prices/current'),
  history: (params) => api.get('/milk-prices/history', { params }),
  set: (data) => api.post('/milk-prices', data),
};

// ── Debt ──────────────────────────────────────────────────────────────────────
export const debtAPI = {
  get: (farmerId) => api.get(`/debt/${farmerId}`),
  addLoan: (data) => api.post('/debt/loan', data),
  addRepayment: (data) => api.post('/debt/repayment', data),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  admin: () => api.get('/dashboard/admin'),
  agent: () => api.get('/dashboard/agent'),
  farmer: () => api.get('/dashboard/farmer'),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  monthlyIncome: (params) => api.get('/reports/monthly-income', { params }),
  agentRevenue: (params) => api.get('/reports/agent-revenue', { params }),
};

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
};

export default api;
