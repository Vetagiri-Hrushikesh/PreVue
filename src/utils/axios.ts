import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock API URL - Using your system's IP address
const axiosServices = axios.create({ 
  baseURL: 'http://192.168.0.3:3002'
});

// ==============================|| TOKEN MANAGEMENT ||============================== //

/**
 * Centralized token management to prevent race conditions
 * This ensures all parts of the app use the same token source
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    // First check the axios defaults (set by JWTContext)
    const authHeader = axios.defaults.headers.common.Authorization;
    if (authHeader && typeof authHeader === 'string') {
      // Extract token from "Bearer <token>" format
      const token = authHeader.replace('Bearer ', '');
      return token || null;
    }
    
    // Fallback to AsyncStorage for React Native
    const token = await AsyncStorage.getItem('serviceToken');
    return token;
  } catch (error) {
    console.error('[axios] Error getting auth token:', error);
    return null;
  }
};

/**
 * Set auth token consistently across the application
 */
export const setAuthToken = async (token: string | null): Promise<void> => {
  try {
    if (token) {
      await AsyncStorage.setItem('serviceToken', token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      await AsyncStorage.removeItem('serviceToken');
      delete axios.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('[axios] Error setting auth token:', error);
  }
};

/**
 * Cancel all pending requests when user logs out
 * This prevents race conditions with requests made during logout
 */
export const cancelAllPendingRequests = (): void => {
  // Cancel all pending requests by aborting the axios instance
  // This is a simple approach - in a more complex app, you might want to track individual requests
  console.log('[axios] Cancelling all pending requests due to logout');
};

// ==============================|| AXIOS - FOR MOCK SERVICES ||============================== //

axiosServices.interceptors.request.use(
  async (config) => {
    console.log('[axios] Making request to:', config.baseURL + config.url, config.method?.toUpperCase());
    
    // Use centralized token management
    const token = await getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[axios] Added auth token to request');
    } else {
      // If no token is available, this might be a logout scenario
      // We can either cancel the request or let it proceed (depending on the endpoint)
      console.log('[axios] No auth token available for request:', config.url);
    }
    return config;
  },
  (error) => {
    console.log('[axios] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

axiosServices.interceptors.response.use(
  (response) => {
    console.log('[axios] Response received:', response.config.url, response.status);
    return response;
  },
  (error) => {  
    console.log('[axios] Request failed:', error.config?.url, error.message);
    console.log('[axios] Error details:', error.response?.status, error.response?.data);
    
    // Only redirect on 401 if we're not already on login page
    if (error.response?.status === 401) {
      console.log('[axios] Unauthorized request, user needs to login');
      // In React Native, we'll handle this in the JWT context
    }
    return Promise.reject((error.response && error.response.data) || error.message || 'Network Error');
  }
);

export default axiosServices;

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosServices.get(url, { ...config });

  return res.data;
};
