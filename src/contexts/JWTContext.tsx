import React, { createContext, useEffect, useReducer, useCallback, useRef } from 'react';

// third-party
import { jwtDecode } from 'jwt-decode';

// reducer - state management
import { LOGIN, LOGOUT, SET_LOADING, SET_ERROR, CLEAR_ERROR } from './auth-reducer/actions';
import authReducer from './auth-reducer/auth';

// project-imports
import axios, { setAuthToken, cancelAllPendingRequests } from '../utils/axios';

// types
import { AuthProps, JWTContextType, AuthError, LoadingState } from '../types/auth';
import { KeyedObject } from '../types/root';

// constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// types
interface LoginAttempt {
  timestamp: number;
  count: number;
}

// constant
const initialState: AuthProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null,
  loading: {
    login: false,
    register: false,
    resetPassword: false,
    updateProfile: false,
    init: false
  },
  error: null
};

/**
 * Enhanced token verification with proper error handling
 */
const verifyToken = (serviceToken: string): boolean => {
  try {
    if (!serviceToken) {
      return false;
    }
    
    const decoded: KeyedObject = jwtDecode(serviceToken);
    const currentTime = Date.now() / 1000;
    
    // Check if token has expired
    if (!decoded.exp || decoded.exp <= currentTime) {
      return false;
    }
    
    // Check if token is about to expire (within threshold)
    if (decoded.exp - currentTime < TOKEN_REFRESH_THRESHOLD / 1000) {
      console.warn('[JWT] Token will expire soon, consider refreshing');
    }
    
    return true;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error);
    return false;
  }
};

/**
 * Secure session management
 */
const setSession = async (serviceToken?: string | null) => {
  try {
    await setAuthToken(serviceToken || null);
  } catch (error) {
    console.error('[JWT] Failed to set session:', error);
    throw new Error('Failed to set authentication session');
  }
};

/**
 * Rate limiting for login attempts
 */
const getLoginAttempts = async (): Promise<LoginAttempt> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const attempts = await AsyncStorage.getItem('loginAttempts');
    return attempts ? JSON.parse(attempts) : { timestamp: 0, count: 0 };
  } catch {
    return { timestamp: 0, count: 0 };
  }
};

const setLoginAttempts = async (attempts: LoginAttempt) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('loginAttempts', JSON.stringify(attempts));
  } catch (error) {
    console.error('[JWT] Failed to set login attempts:', error);
  }
};

const isAccountLocked = async (): Promise<boolean> => {
  const attempts = await getLoginAttempts();
  const now = Date.now();
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = now - attempts.timestamp;
    if (timeSinceLastAttempt < LOCKOUT_DURATION) {
      return true;
    } else {
      // Reset attempts after lockout period
      await setLoginAttempts({ timestamp: 0, count: 0 });
    }
  }
  
  return false;
};

// ==============================|| JWT CONTEXT & PROVIDER ||============================== //

const JWTContext = createContext<JWTContextType | null>(null);

export const JWTProvider = ({ children }: { children: React.ReactElement }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  /**
   * Clear any existing refresh timeout
   */
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  /**
   * Set up token refresh mechanism
   */
  const setupTokenRefresh = useCallback((token: string) => {
    try {
      const decoded: KeyedObject = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = (decoded.exp - currentTime) * 1000;
      
      // Set refresh timeout 5 minutes before expiry
      const refreshTime = Math.max(timeUntilExpiry - TOKEN_REFRESH_THRESHOLD, 0);
      
      clearRefreshTimeout();
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('[JWT] Refreshing token...');
          const response = await axios.post('/api/account/refresh');
          const { serviceToken } = response.data;
          await setSession(serviceToken);
          setupTokenRefresh(serviceToken); // Setup next refresh
        } catch (error) {
          console.error('[JWT] Token refresh failed:', error);
          logout();
        }
      }, refreshTime);
    } catch (error) {
      console.error('[JWT] Failed to setup token refresh:', error);
    }
  }, [clearRefreshTimeout]);

  /**
   * Helper function to update loading state
   */
  const updateLoadingState = useCallback((key: keyof LoadingState, value: boolean) => {
    const currentLoading = state.loading || {
      login: false,
      register: false,
      resetPassword: false,
      updateProfile: false,
      init: false
    };
    
    dispatch({
      type: SET_LOADING,
      payload: {
        ...currentLoading,
        [key]: value
      }
    });
  }, [state.loading]);

  /**
   * Enhanced error handling
   */
  const handleAuthError = useCallback((error: any, operation: string): AuthError => {
    console.error(`[JWT] ${operation} failed:`, error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return {
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials or session expired',
            details: data
          };
        case 403:
          return {
            code: 'FORBIDDEN',
            message: 'Access denied',
            details: data
          };
        case 429:
          return {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            details: data
          };
        case 500:
          return {
            code: 'SERVER_ERROR',
            message: 'Server error. Please try again later.',
            details: data
          };
        default:
          return {
            code: 'UNKNOWN_ERROR',
            message: data?.message || 'An unexpected error occurred',
            details: data
          };
      }
    } else if (error.request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        details: error.request
      };
    } else {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error
      };
    }
  }, []);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const init = async () => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;
      
      try {
        updateLoadingState('init', true);
        dispatch({ type: CLEAR_ERROR });
        
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const serviceToken = await AsyncStorage.getItem('serviceToken');
        
        if (serviceToken && verifyToken(serviceToken)) {
          await setSession(serviceToken);
          
          const response = await axios.get('/api/account/me');
          const { user } = response.data;
          
          dispatch({
            type: LOGIN,
            payload: {
              isLoggedIn: true,
              user
            }
          });
          
          setupTokenRefresh(serviceToken);
        } else {
          // Clear invalid token
          await setSession(null);
          dispatch({ type: LOGOUT });
        }
      } catch (error) {
        const authError = handleAuthError(error, 'initialization');
        dispatch({ type: SET_ERROR, payload: authError });
        dispatch({ type: LOGOUT });
      } finally {
        updateLoadingState('init', false);
        isInitializingRef.current = false;
      }
    };

    init();
    
    // Cleanup on unmount
    return () => {
      clearRefreshTimeout();
    };
  }, [handleAuthError, setupTokenRefresh, clearRefreshTimeout]);

  /**
   * Enhanced login with rate limiting and security
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      // Check for account lockout
      if (await isAccountLocked()) {
        const attempts = await getLoginAttempts();
        const remainingTime = Math.ceil((LOCKOUT_DURATION - (Date.now() - attempts.timestamp)) / 1000 / 60);
        throw new Error(`Account temporarily locked. Please try again in ${remainingTime} minutes.`);
      }
      
      updateLoadingState('login', true);
      dispatch({ type: CLEAR_ERROR });
      
      // Don't log sensitive data in production
      console.log('[JWT] Attempting login for:', email);
      
      const response = await axios.post('/api/account/login', { email, password });
      const { serviceToken, user } = response.data;
      
      await setSession(serviceToken);
      setupTokenRefresh(serviceToken);
      
      dispatch({
        type: LOGIN,
        payload: {
          isLoggedIn: true,
          user
        }
      });
      
      // Reset login attempts on successful login
      await setLoginAttempts({ timestamp: 0, count: 0 });
      
      console.log('[JWT] Login successful for:', email);
    } catch (error) {
      const authError = handleAuthError(error, 'login');
      
      // Handle rate limiting
      if (authError.code === 'UNAUTHORIZED') {
        const attempts = await getLoginAttempts();
        const newAttempts = {
          timestamp: Date.now(),
          count: attempts.count + 1
        };
        await setLoginAttempts(newAttempts);
        
        if (newAttempts.count >= MAX_LOGIN_ATTEMPTS) {
          authError.message = `Account locked due to too many failed attempts. Please try again in ${Math.ceil(LOCKOUT_DURATION / 1000 / 60)} minutes.`;
        }
      }
      
      dispatch({ type: SET_ERROR, payload: authError });
      throw authError;
    } finally {
      updateLoadingState('login', false);
    }
  }, [handleAuthError, setupTokenRefresh]);

  /**
   * Enhanced registration with validation
   */
  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      updateLoadingState('register', true);
      dispatch({ type: CLEAR_ERROR });
      
      // Basic validation
      if (!email || !password || !firstName || !lastName) {
        throw new Error('All fields are required');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      const response = await axios.post('/api/account/register', {
        email,
        password,
        firstName,
        lastName
      });
      
      console.log('[JWT] Registration successful for:', email);
      return response.data;
    } catch (error) {
      const authError = handleAuthError(error, 'registration');
      dispatch({ type: SET_ERROR, payload: authError });
      throw authError;
    } finally {
      updateLoadingState('register', false);
    }
  }, [handleAuthError]);

  /**
   * Enhanced logout with cleanup
   */
  const logout = useCallback(async () => {
    try {
      console.log('[JWT] Logging out user');
      
      // Cancel any pending requests
      cancelAllPendingRequests();
      
      // Clear refresh timeout
      clearRefreshTimeout();
      
      // Clear session
      await setSession(null);
      
      // Clear login attempts
      await setLoginAttempts({ timestamp: 0, count: 0 });
      
      dispatch({ type: LOGOUT });
      
      console.log('[JWT] Logout successful');
    } catch (error) {
      console.error('[JWT] Logout error:', error);
      // Force logout even if cleanup fails
      dispatch({ type: LOGOUT });
    }
  }, [clearRefreshTimeout]);

  /**
   * Enhanced password reset
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      updateLoadingState('resetPassword', true);
      dispatch({ type: CLEAR_ERROR });
      
      if (!email) {
        throw new Error('Email is required');
      }
      
      const response = await axios.post('/api/account/reset-password', { email });
      
      console.log('[JWT] Password reset initiated for:', email);
      return response.data;
    } catch (error) {
      const authError = handleAuthError(error, 'password reset');
      dispatch({ type: SET_ERROR, payload: authError });
      throw authError;
    } finally {
      updateLoadingState('resetPassword', false);
    }
  }, [handleAuthError]);

  /**
   * Enhanced profile update
   */
  const updateProfile = useCallback(async (profileData: any) => {
    try {
      updateLoadingState('updateProfile', true);
      dispatch({ type: CLEAR_ERROR });
      
      const response = await axios.put('/api/account/profile', profileData);
      const { user } = response.data;
      
      // Update user in state
      dispatch({
        type: LOGIN,
        payload: {
          isLoggedIn: true,
          user
        }
      });
      
      console.log('[JWT] Profile updated successfully');
      return response.data;
    } catch (error) {
      const authError = handleAuthError(error, 'profile update');
      dispatch({ type: SET_ERROR, payload: authError });
      throw authError;
    } finally {
      updateLoadingState('updateProfile', false);
    }
  }, [handleAuthError]);

  // Show loading state during initialization
  if (!state.isInitialized) {
    return null; // We'll handle loading in the component
  }

  return (
    <JWTContext.Provider 
      value={{ 
        ...state, 
        login, 
        logout, 
        register, 
        resetPassword, 
        updateProfile 
      }}
    >
      {children}
    </JWTContext.Provider>
  );
};

export default JWTContext;
