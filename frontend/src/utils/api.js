// utils/api.js
import axios from 'axios';
import { TokenManager } from '../api/authApi';

// Custom error class for better error handling
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced error logger
const logError = (error) => {
  if (import.meta.env.DEV) {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      endpoint: error.config?.url,
      method: error.config?.method,
    });
  }
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token) {
      console.log('Adding token to request:', token ? `${token.substring(0, 10)}...` : 'No token');
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logError(error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      success: response.data?.success
    });
    return response;
  },
  async (error) => {
    logError(error);

    // Handle unauthorized errors
    if (error.response?.status === 401) {
      console.log('Unauthorized error detected, clearing auth state');
      TokenManager.clearAuth();
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Transform error for better handling
    throw new ApiError(
      error.response?.data?.message || 'An error occurred',
      error.response?.status,
      error.response?.data
    );
  }
);

export default axiosInstance;