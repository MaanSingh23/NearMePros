import axios from 'axios';

// Professional API configuration
// During development, it uses http://localhost:5000
// During production, it will use the VITE_API_URL environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Log the connection status for easier debugging on mobile
console.log(`[Near Me Pros] Initializing API connection to: ${API_URL}`);
if (API_URL.includes('localhost')) {
  console.warn('[Near Me Pros] WARNING: Your app is still trying to connect to your local computer. This will NOT work on mobile phones. Please ensure VITE_API_URL is set correctly in Vercel settings.');
}

import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token in every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global Error Handling Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Unknown Error';
    
    // Specifically handle network errors (e.g. server sleeping)
    if (error.code === 'ERR_NETWORK') {
      toast.error('Unable to connect to server. Please wait 1 minute for the backend to wake up.', { duration: 6000 });
    } else {
      // Don't show toast for 401s if they are handled by auth context
      if (error.response?.status !== 401) {
        toast.error(`API Error: ${message}`);
      }
    }
    
    console.error('[Near Me Pros] Connection Failure:', error);
    return Promise.reject(error);
  }
);

export default api;
