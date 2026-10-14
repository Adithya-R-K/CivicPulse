import axios from 'axios';

// Configurable Civic Core Service Microservice base URL
const CORE_BASE_URL =
  import.meta.env.VITE_CORE_API_URL ||
  import.meta.env.VITE_API_URL ||
  '/api/v1';

const API = axios.create({
  baseURL: CORE_BASE_URL,
});

// Attach JWT token from localStorage to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('civicpulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 unauthenticated responses cleanly
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        // preserve login flow
      }
    }
    return Promise.reject(error);
  }
);

// Optional direct client for Civic Intelligence Microservice (standalone AI tools)
export const IntelligenceAPI = axios.create({
  baseURL:
    import.meta.env.VITE_INTELLIGENCE_API_URL ||
    'http://localhost:5001/api/v1',
});

export default API;
