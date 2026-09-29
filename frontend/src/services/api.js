/**
 * ==============================================================================
 * File: frontend/src/services/api.js
 * Description: Axios HTTP Client & API Service Layer
 * Purpose: Centralizes all API calls from the React frontend to the Node.js backend.
 *
 * Why this file exists:
 * - Keeps networking code organized in one place rather than scattered across components.
 * - Automatically attaches the JWT Bearer token from localStorage to every request.
 * - Standardizes error handling and response data parsing.
 * ==============================================================================
 */

import axios from 'axios';

// Vite proxy forwards /api to http://localhost:5000/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Automatically inject JWT Bearer token into Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global errors like expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, remove from storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------------------
// Authentication API
// ------------------------------------------------------------------------------
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (name, email, password, role = 'customer') => {
    const response = await api.post('/auth/register', { name, email, password, role });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// ------------------------------------------------------------------------------
// Tickets API
// ------------------------------------------------------------------------------
export const ticketService = {
  create: async (description) => {
    const response = await api.post('/tickets', { description });
    return response.data;
  },
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);

    const response = await api.get(`/tickets?${params.toString()}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/tickets/${id}/status`, { status });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/tickets/stats');
    return response.data;
  }
};

export default api;
