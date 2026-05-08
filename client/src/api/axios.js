import axios from 'axios';

const BACKEND_BASE_URL = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE_URL}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
export { BACKEND_BASE_URL, API_BASE_URL };

