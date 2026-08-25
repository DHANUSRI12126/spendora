import axios from 'axios';

// Use the separately deployed backend in production; override it with VITE_API_URL when needed.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically inject JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spendora_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration or unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired local authentication tokens
      localStorage.removeItem('spendora_token');
      localStorage.removeItem('spendora_user');
      
      // Optional: Redirect to login page if currently on a protected page
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
