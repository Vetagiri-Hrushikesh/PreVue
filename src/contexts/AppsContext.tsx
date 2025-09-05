import React, { createContext, useEffect, useReducer, useRef, useState } from 'react';

// project-imports
import { appsAPI } from '../api/femuxer';
import useAuth from '../hooks/useAuth';
import { useSSEContext } from './SSEContext';
import { useRealTimeSync } from '../hooks/useRealTimeSync';

// reducer - state management
import {
  FETCH_APPS,
  FETCH_APPS_SUCCESS,
  FETCH_APPS_FAILURE,
  FETCH_TRASHED_APPS,
  FETCH_TRASHED_APPS_SUCCESS,
  FETCH_TRASHED_APPS_FAILURE,
  CREATE_APP,
  CREATE_APP_SUCCESS,
  CREATE_APP_FAILURE,
  UPDATE_APP,
  UPDATE_APP_SUCCESS,
  UPDATE_APP_FAILURE,
  DELETE_APP,
  DELETE_APP_SUCCESS,
  DELETE_APP_FAILURE,
  SOFT_DELETE_APP,
  SOFT_DELETE_APP_OPTIMISTIC,
  SOFT_DELETE_APP_SUCCESS,
  SOFT_DELETE_APP_FAILURE,
  SOFT_DELETE_APP_ROLLBACK,
  RECOVER_APP,
  RECOVER_APP_OPTIMISTIC,
  RECOVER_APP_SUCCESS,
  RECOVER_APP_FAILURE,
  RECOVER_APP_ROLLBACK,
  PERMANENT_DELETE_APP,
  PERMANENT_DELETE_APP_OPTIMISTIC,
  PERMANENT_DELETE_APP_SUCCESS,
  PERMANENT_DELETE_APP_FAILURE,
  PERMANENT_DELETE_APP_ROLLBACK,
  UPDATE_APP_FROM_SYNC,
  SET_SELECTED_APP,
  CLEAR_SELECTED_APP,
  SET_MODAL_STATE,
  SET_LOADING_STATE,
  UPDATE_PROGRESS,
  CLEAR_PROGRESS,
  SET_CURRENT_PROGRESS_ID,
  CLEAR_CURRENT_PROGRESS_ID,
  CLEAR_ALL_APPS_DATA,
  ADD_PENDING_OPERATION,
  REMOVE_PENDING_OPERATION,
  UPDATE_PENDING_OPERATION,
  SHOW_PENDING_OPERATIONS_DIALOG,
  HIDE_PENDING_OPERATIONS_DIALOG,
  SET_CANCELLING_OPERATIONS
} from './apps-reducer/actions';
import appsReducer, { initialState } from './apps-reducer/apps';
import { AppsState, AppsAction } from '../types/app';

// project-imports
import { AppData, AppsContextType } from '../types/app';

// ==============================|| APPS CONTEXT & PROVIDER ||============================== //

const AppsContext = createContext<AppsContextType | null>(null);

export const AppsProvider = ({ children }: { children: React.ReactElement }) => {
  const [state, dispatch] = useReducer(appsReducer, initialState);
  const { user } = useAuth();

  // SSE/WebSocket integration
  const { 
    isConnected, 
    subscribeToCorrelationIds: sseSubscribeToCorrelationIds, 
    getStatus, 
    isStatusComplete, 
    isStatusFailed 
  } = useSSEContext();

  // Use ref to track if we've already attempted to fetch data
  const hasAttemptedFetch = useRef(false);
  
  // Track current correlation IDs for async operations
  const currentCorrelationIds = useRef<Set<string>>(new Set());
  const pendingNavigationCallback = useRef<(() => void) | null>(null);

  // Track previous user ID to detect user changes
  const previousUserId = useRef<string | null>(null);

  // Real-time sync integration
  const { isConnected: realTimeConnected } = useRealTimeSync(
    // onAppUpdate
    (updatedApp: AppData) => {
      console.log('[apps-context] Real-time app update received:', updatedApp);
      dispatch({ type: UPDATE_APP_FROM_SYNC, payload: updatedApp });
    },
    // onAppDelete
    (appId: string) => {
      console.log('[apps-context] Real-time app delete received:', appId);
      // Remove from apps list
      dispatch({ type: SOFT_DELETE_APP_OPTIMISTIC, payload: appId });
    },
    // onAppCreate
    (newApp: AppData) => {
      console.log('[apps-context] Real-time app create received:', newApp);
      dispatch({ type: CREATE_APP_SUCCESS, payload: newApp });
    },
    // onAppPermanentDelete
    (appId: string) => {
      console.log('[apps-context] Real-time app permanent delete received:', appId);
      // Remove from trashed apps list
      dispatch({ type: PERMANENT_DELETE_APP_SUCCESS, payload: appId });
    }
  );

  // Clear apps data when user changes or logs out
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // If we have a previous user and the current user is different, clear all data
    if (previousUserId.current && currentUserId && previousUserId.current !== currentUserId) {
      console.log('[apps-context] User changed from', previousUserId.current, 'to', currentUserId, '- clearing apps data');
      clearAllAppsData();
    }
    
    // If we had a previous user and now we don't (logout), clear all data
    if (previousUserId.current && !currentUserId) {
      console.log('[apps-context] User logged out - clearing apps data');
      clearAllAppsData();
    }
    
    // If we have no previous user and no current user (initial state), ensure data is cleared
    if (!previousUserId.current && !currentUserId) {
      console.log('[apps-context] No user detected - ensuring apps data is cleared');
      clearAllAppsData();
    }
    
    // Update the previous user ID
    previousUserId.current = currentUserId;
  }, [user?.id]);

  // Clear progress when user is not logged in
  useEffect(() => {
    if (!user?.id) {
      console.log('[apps-context] No user logged in - clearing current progress');
      dispatch({ type: CLEAR_CURRENT_PROGRESS_ID });
      
      // Also clear all progress data
      Object.keys(state.progress).forEach(correlationId => {
        dispatch({ type: CLEAR_PROGRESS, payload: correlationId });
      });
    }
  }, [user?.id, state.progress]);

  // Subscribe to SSE updates for pending operations
  useEffect(() => {
    if (isConnected && Object.keys(state.pendingOperations).length > 0) {
      const correlationIds = Object.keys(state.pendingOperations);
      console.log('[apps-context] Subscribing to SSE updates for correlation IDs:', correlationIds);
      sseSubscribeToCorrelationIds(correlationIds);
    }
  }, [isConnected, state.pendingOperations, sseSubscribeToCorrelationIds]);

  // Monitor SSE status updates for pending operations
  useEffect(() => {
    if (!isConnected) return;

    Object.keys(state.pendingOperations).forEach(correlationId => {
      const status = getStatus(correlationId);
      if (status) {
        console.log('[apps-context] SSE status update for', correlationId, ':', status);
        
        // Update progress
        dispatch({
          type: UPDATE_PROGRESS,
          payload: {
            correlationId,
            status: status.status,
            progress: status.data?.progress || 0,
            stage: status.data?.stage,
            message: status.message,
            error: status.error,
            data: status.data
          }
        });

        // Handle completion
        if (isStatusComplete(correlationId)) {
          console.log('[apps-context] Operation completed:', correlationId, status.status);
          
          if (isStatusFailed(correlationId)) {
            console.error('[apps-context] Operation failed:', correlationId, status.error);
            // Handle failure - this will be handled by the specific operation handlers
          } else {
            console.log('[apps-context] Operation succeeded:', correlationId);
            // Handle success - this will be handled by the specific operation handlers
          }
        }
      }
    });
  }, [isConnected, state.pendingOperations, getStatus, isStatusComplete, isStatusFailed]);

  const fetchApps = async (ownerId: string) => {
    // Prevent multiple simultaneous requests
    if (state.loading.fetch || hasAttemptedFetch.current) {
      return;
    }

    hasAttemptedFetch.current = true;

    try {
      dispatch({ type: FETCH_APPS });
      console.log('[apps-context] Fetching apps via centralized API');
      
      const response = await appsAPI.fetch(ownerId);
      
      console.log('[apps-context] Response data received:', response);

      let appList = [];
      let message = 'Apps fetched';
      
      if (response.data && typeof response.data === 'object' && 'result' in response.data) {
        const result = response.data.result as any;
        appList = result?.data || [];
        message = result?.message || response.message || 'Apps fetched';
      } else if (response.data) {
        appList = Array.isArray(response.data) ? response.data : [];
        message = response.message || 'Apps fetched';
      }

      console.log('[apps-context] Parsed apps:', appList);
      dispatch({ type: FETCH_APPS_SUCCESS, payload: appList });
    } catch (err: any) {
      console.error('[apps-context] Error fetching apps:', err);

      const errorMessage = err.response?.data?.message || 'Failed to fetch apps';
      dispatch({ type: FETCH_APPS_FAILURE, payload: errorMessage });
    }
  };

  const fetchTrashedApps = async (ownerId: string) => {
    // Prevent multiple simultaneous requests
    if (state.loading.fetchTrashed) {
      console.log('[apps-context] Fetch trashed apps already in progress, skipping');
      return;
    }

    try {
      dispatch({ type: FETCH_TRASHED_APPS });
      console.log('[apps-context] Fetching trashed apps via centralized API for ownerId:', ownerId);
      
      const response = await appsAPI.fetchTrashed(ownerId);
      
      console.log('[apps-context] Fetch trashed apps response:', response);

      let appList = [];
      let message = 'Trashed apps fetched';
      
      if (response.data && typeof response.data === 'object' && 'result' in response.data) {
        const result = response.data.result as any;
        appList = result?.data || [];
        message = result?.message || response.message || 'Trashed apps fetched';
      } else if (response.data) {
        appList = Array.isArray(response.data) ? response.data : [];
        message = response.message || 'Trashed apps fetched';
      }

      console.log('[apps-context] Parsed trashed apps:', appList);
      dispatch({ type: FETCH_TRASHED_APPS_SUCCESS, payload: appList });
    } catch (err: any) {
      console.error('[apps-context] Error fetching trashed apps:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to fetch trashed apps';
      dispatch({ type: FETCH_TRASHED_APPS_FAILURE, payload: errorMessage });
    }
  };

  const fetchApp = async (appId: string): Promise<AppData | null> => {
    try {
      console.log('[apps-context] Fetching single app via centralized API:', appId);
      
      const response = await appsAPI.fetchApp(appId);
      
      console.log('[apps-context] Single app response:', response);

      // Handle nested response structure from Femuxer
      let appData = null;
      let message = 'App details fetched';
      
      if (response.data && typeof response.data === 'object' && 'result' in response.data) {
        const result = response.data.result as any;
        appData = result?.data || null;
        message = result?.message || response.message || 'App details fetched';
      } else if (response.data) {
        appData = response.data;
        message = response.message || 'App details fetched';
      }

      console.log('[apps-context] Fetched app data:', appData);
      return appData;
    } catch (err: any) {
      console.error('[apps-context] Error fetching single app:', err);

      const errorMessage = err.response?.data?.message || 'Failed to fetch app details';
      return null;
    }
  };

  const createApp = async (appData: Partial<AppData>) => {
    console.log('🎯 [DEVPORTAL-AppsContext] createApp called with:', appData);
    
    try {
      console.log('📤 [DEVPORTAL-AppsContext] Dispatching CREATE_APP action');
      dispatch({ type: CREATE_APP });
      console.log('🌐 [DEVPORTAL-AppsContext] Calling appsAPI.create');
      
      const response = await appsAPI.create(appData);
      
      console.log('📥 [DEVPORTAL-AppsContext] API response received:', response);

      // Check if we got a correlation ID for async operation
      if (response.data?.correlationId) {
        const correlationId = response.data.correlationId;
        console.log('🆔 [DEVPORTAL-AppsContext] Received correlation ID for async operation:', correlationId);
        
        // Add correlation ID to tracking set
        currentCorrelationIds.current.add(correlationId);
        console.log('📋 [DEVPORTAL-AppsContext] Added to tracking set, current IDs:', Array.from(currentCorrelationIds.current));
        
        // Add to pending operations for navigation guards
        addPendingOperation(correlationId, {
          type: 'app_creation',
          progress: 0,
          message: 'App creation in progress...',
          startedAt: new Date().toISOString()
        });
        
        console.log('⏳ [DEVPORTAL-AppsContext] Async operation started, waiting for completion');
        
        // Don't dispatch success yet - wait for completion
        return correlationId;
      }

      // Immediate success (synchronous operation)
      console.log('✅ [DEVPORTAL-AppsContext] Immediate success, dispatching CREATE_APP_SUCCESS');
      const createdApp = response.data;
      const message = response.message || 'App created successfully';

      dispatch({ type: CREATE_APP_SUCCESS, payload: createdApp });
      return null; // No correlation ID for synchronous operations
    } catch (err: any) {
      console.error('❌ [DEVPORTAL-AppsContext] Error creating app:', err);
      console.log('🔍 [DEVPORTAL-AppsContext] Error structure:', {
        hasResponse: !!err.response,
        responseData: err.response?.data,
        responseStatus: err.response?.status,
        responseStatusText: err.response?.statusText,
        message: err.message,
        errorType: typeof err
      });
      
      // Enhanced error message extraction to handle different error formats
      let errorMessage = 'Failed to create app';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.result?.message) {
        errorMessage = err.response.data.result.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      console.log('🔍 [DEVPORTAL-AppsContext] Extracted error message:', errorMessage);
      
      dispatch({ type: CREATE_APP_FAILURE, payload: errorMessage });
    }
  };

  const cancelAppCreation = async (correlationId: string) => {
    console.log('🚫 [DEVPORTAL-AppsContext] Cancelling app creation for correlation ID:', correlationId);
    
    try {
      // Send cancellation request via Femuxer API
      console.log('📤 [DEVPORTAL-AppsContext] Sending cancellation request for correlation ID:', correlationId);
      
      const response = await appsAPI.cancelAppCreation(correlationId);
      
      console.log('📥 [DEVPORTAL-AppsContext] Cancellation response:', response);
      
      // Update progress to show cancellation
      dispatch({
        type: UPDATE_PROGRESS,
        payload: {
          correlationId,
          status: 'CANCELLED',
          message: 'App creation cancelled by user',
          progress: 0
        }
      });
      
      // Clear current progress ID if this is the current progress
      if (state.currentProgressId === correlationId) {
        dispatch({ type: CLEAR_CURRENT_PROGRESS_ID });
      }
      
      // Remove from tracking
      currentCorrelationIds.current.delete(correlationId);
      
      // Remove from pending operations
      removePendingOperation(correlationId);
      console.log('🗑️ [DEVPORTAL-AppsContext] Removed from pending operations (cancelled):', correlationId);
      
      console.log('✅ [DEVPORTAL-AppsContext] App creation cancelled successfully');
    } catch (err: any) {
      console.error('❌ [DEVPORTAL-AppsContext] Error cancelling app creation:', err);
    }
  };

  const updateApp = async (appId: string, appData: Partial<AppData>) => {
    try {
      dispatch({ type: UPDATE_APP });
      console.log('🔄 [DEVPORTAL-AppsContext] Updating app via centralized API:', { appId, appData });
      
      const response = await appsAPI.update(appId, appData);
      
      console.log('📥 [DEVPORTAL-AppsContext] Update response:', response);
      console.log('🔍 [DEVPORTAL-AppsContext] Response structure:', {
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : null,
        hasMessage: !!response.message,
        message: response.message,
        fullResponse: response
      });

      // Extract the updated app data - handle different response structures
      let updatedApp = response.data;
      let message = response.message || 'App updated successfully';
      
      // Check if the response has a nested result structure
      if ((response as any).result && (response as any).result.data) {
        updatedApp = (response as any).result.data;
        message = (response as any).result.message || message;
      }
      
      // Check if the response has a nested data structure
      if (response.data && (response.data as any).result && (response.data as any).result.data) {
        updatedApp = (response.data as any).result.data;
        message = (response.data as any).result.message || message;
      }
      
      console.log('✅ [DEVPORTAL-AppsContext] Dispatching UPDATE_APP_SUCCESS with:', updatedApp);
      console.log('🔍 [DEVPORTAL-AppsContext] Updated app ID:', updatedApp?.id);
      console.log('🔍 [DEVPORTAL-AppsContext] Updated app name:', updatedApp?.name);
      console.log('🔍 [DEVPORTAL-AppsContext] Full response.data structure:', response.data);
      
      // Ensure we have a valid app object with an ID
      if (!updatedApp || !updatedApp.id) {
        console.error('❌ [DEVPORTAL-AppsContext] Invalid updated app data:', updatedApp);
        throw new Error('Invalid response: missing app data or ID');
      }

      dispatch({ type: UPDATE_APP_SUCCESS, payload: updatedApp });
    } catch (err: any) {
      console.error('[apps-context] Error updating app:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to update app';
      dispatch({ type: UPDATE_APP_FAILURE, payload: errorMessage });
    }
  };

  const deleteApp = async (appId: string) => {
    try {
      dispatch({ type: DELETE_APP });
      console.log('[apps-context] Deleting app via centralized API');
      
      const response = await appsAPI.delete(appId);
      
      console.log('[apps-context] Delete response:', response);

      const message = response.message || 'App deleted successfully';
      dispatch({ type: DELETE_APP_SUCCESS, payload: appId });
    } catch (err: any) {
      console.error('[apps-context] Error deleting app:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to delete app';
      dispatch({ type: DELETE_APP_FAILURE, payload: errorMessage });
    }
  };

  const moveToTrash = async (appId: string) => {
    // Prevent multiple simultaneous requests
    if (state.loading.softDelete) {
      console.log('[apps-context] Move to trash already in progress, skipping');
      return;
    }

    // Store original state for rollback
    const originalApps = [...state.apps];
    
    try {
      // Optimistic update - immediately show the app as being moved
      dispatch({ type: SOFT_DELETE_APP_OPTIMISTIC, payload: appId });
      
      console.log('🎯 [DEVPORTAL-AppsContext] moveToTrash called with appId:', appId);
      console.log('🌐 [DEVPORTAL-AppsContext] Calling appsAPI.moveToTrash');
      
      const response = await appsAPI.moveToTrash(appId);
      
      console.log('📥 [DEVPORTAL-AppsContext] Move to trash response:', response);

      const message = response.message || 'App moved to trash successfully';
      
      // Use the updated app data from backend response if available
      const updatedApp = response.data;
      if (updatedApp && updatedApp.id) {
        // Update the app in the list with the latest data from backend
        dispatch({ type: SOFT_DELETE_APP_SUCCESS, payload: updatedApp });
      } else {
        // Fallback: just remove the app by ID
        dispatch({ type: SOFT_DELETE_APP_SUCCESS, payload: appId });
      }
    } catch (err: any) {
      console.error('[apps-context] Error moving app to trash:', err);
      
      // Rollback optimistic update
      dispatch({ type: SOFT_DELETE_APP_ROLLBACK, payload: originalApps });
      
      const errorMessage = err.response?.data?.message || 'Failed to move app to trash';
      dispatch({ type: SOFT_DELETE_APP_FAILURE, payload: errorMessage });
    }
  };

  const restoreFromTrash = async (appId: string) => {
    // Prevent multiple simultaneous requests
    if (state.loading.recover) {
      console.log('[apps-context] Restore from trash already in progress, skipping');
      return;
    }

    // Store original state for rollback
    const originalTrashedApps = [...state.trashedApps];
    
    try {
      // Optimistic update - immediately show the app as being restored
      dispatch({ type: RECOVER_APP_OPTIMISTIC, payload: appId });
      
      console.log('🎯 [DEVPORTAL-AppsContext] restoreFromTrash called with appId:', appId);
      console.log('🌐 [DEVPORTAL-AppsContext] Calling appsAPI.restoreFromTrash');
      
      const response = await appsAPI.restoreFromTrash(appId);
      
      console.log('📥 [DEVPORTAL-AppsContext] Restore from trash response:', response);

      const message = response.message || 'App restored from trash successfully';
      
      // Use the updated app data from backend response if available
      const updatedApp = response.data;
      if (updatedApp && updatedApp.id) {
        // Update the app in the list with the latest data from backend
        dispatch({ type: RECOVER_APP_SUCCESS, payload: updatedApp });
      } else {
        // Fallback: just remove the app by ID
        dispatch({ type: RECOVER_APP_SUCCESS, payload: appId });
      }
      
      // No need to refresh the main apps list - the reducer now handles the UI update
      console.log('[apps-context] App restored successfully - UI updated via reducer');
    } catch (err: any) {
      console.error('[apps-context] Error restoring app from trash:', err);
      
      // Rollback optimistic update
      dispatch({ type: RECOVER_APP_ROLLBACK, payload: originalTrashedApps });
      
      const errorMessage = err.response?.data?.message || 'Failed to restore app from trash';
      dispatch({ type: RECOVER_APP_FAILURE, payload: errorMessage });
    }
  };

  const permanentDelete = async (appId: string) => {
    try {
      dispatch({ type: PERMANENT_DELETE_APP });
      console.log('[apps-context] Permanently deleting app via centralized API:', appId);
      
      const response = await appsAPI.permanentDelete(appId);
      
      console.log('[apps-context] Permanent delete response:', response);

      const message = response.message || 'App permanently deleted successfully';
      dispatch({ type: PERMANENT_DELETE_APP_SUCCESS, payload: appId });
    } catch (err: any) {
      console.error('[apps-context] Error permanently deleting app:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to permanently delete app';
      dispatch({ type: PERMANENT_DELETE_APP_FAILURE, payload: errorMessage });
    }
  };

  const emptyTrash = async () => {
    try {
      dispatch({ type: DELETE_APP }); // Empty trash
      console.log('[apps-context] Emptying trash via centralized API');
      
      const response = await appsAPI.emptyTrash();
      
      console.log('[apps-context] Empty trash response:', response);

      const message = response.message || 'Trash emptied successfully';
      dispatch({ type: DELETE_APP_SUCCESS, payload: [] }); // Clear all apps from state
    } catch (err: any) {
      console.error('[apps-context] Error emptying trash:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to empty trash';
      dispatch({ type: DELETE_APP_FAILURE, payload: errorMessage });
    }
  };

  const setSelectedApp = (app: AppData | null) => {
    if (app) {
      dispatch({ type: SET_SELECTED_APP, payload: app });
    } else {
      dispatch({ type: CLEAR_SELECTED_APP });
    }
  };

  const openModal = (modalType: 'create' | 'update' | 'delete' | 'trash') => {
    dispatch({ type: SET_MODAL_STATE, payload: { [modalType]: true } });
  };

  const closeModal = (modalType: 'create' | 'update' | 'delete' | 'trash') => {
    dispatch({ type: SET_MODAL_STATE, payload: { [modalType]: false } });
  };

  const setLoading = (loadingType: keyof AppsState['loading'], value: boolean) => {
    dispatch({ type: SET_LOADING_STATE, payload: { [loadingType]: value } });
  };

  const refreshApps = async (ownerId: string) => {
    // Reset the fetch flag to allow retry
    hasAttemptedFetch.current = false;
    await fetchApps(ownerId);
  };

  const startBuild = async (appId: string, buildConfig: any) => {
    try {
      console.log('[apps-context] Starting build for app:', appId, buildConfig);
      
      const response = await appsAPI.startBuild(appId, buildConfig);
      
      console.log('[apps-context] Build started response:', response);

      if (response.data?.correlationId) {
        console.log('[apps-context] Received correlation ID for build:', response.data.correlationId);
        
        // Subscribe to SSE updates for this build
        currentCorrelationIds.current.add(response.data.correlationId);
        
        return response.data.correlationId;
      }
      
      return response.data;
    } catch (err: any) {
      console.error('[apps-context] Error starting build:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to start build';
      throw err;
    }
  };

  const buildAAB = async (appId: string, options: any = {}) => {
    try {
      console.log('[apps-context] Starting AAB build for app:', appId);
      
      const response = await appsAPI.buildAAB(appId, options);
      
      console.log('[apps-context] AAB build response:', response);

      if (response.data?.correlationId) {
        console.log('[apps-context] Received correlation ID for AAB build:', response.data.correlationId);
        
        // Subscribe to SSE updates for this build
        currentCorrelationIds.current.add(response.data.correlationId);
        
        // Add to pending operations
        addPendingOperation(response.data.correlationId, {
          type: 'buildAAB',
          appId,
          startedAt: new Date().toISOString(),
          status: 'IN_PROGRESS'
        });
        
        return response.data.correlationId;
      }
      
      return response.data;
    } catch (err: any) {
      console.error('[apps-context] Error starting AAB build:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to start AAB build';
      throw err;
    }
  };

  const buildDebug = async (appId: string, options: any = {}) => {
    try {
      console.log('[apps-context] Starting debug build for app:', appId);
      
      const response = await appsAPI.buildDebug(appId, options);
      
      console.log('[apps-context] Debug build response:', response);

      if (response.data?.correlationId) {
        console.log('[apps-context] Received correlation ID for debug build:', response.data.correlationId);
        
        // Subscribe to SSE updates for this build
        currentCorrelationIds.current.add(response.data.correlationId);
        
        // Add to pending operations
        addPendingOperation(response.data.correlationId, {
          type: 'buildDebug',
          appId,
          startedAt: new Date().toISOString(),
          status: 'IN_PROGRESS'
        });
        
        return response.data.correlationId;
      }
      
      return response.data;
    } catch (err: any) {
      console.error('[apps-context] Error starting debug build:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to start debug build';
      throw err;
    }
  };

  const buildRelease = async (appId: string, options: any = {}) => {
    try {
      console.log('[apps-context] Starting release build for app:', appId);
      
      const response = await appsAPI.buildRelease(appId, options);
      
      console.log('[apps-context] Release build response:', response);

      if (response.data?.correlationId) {
        console.log('[apps-context] Received correlation ID for release build:', response.data.correlationId);
        
        // Subscribe to SSE updates for this build
        currentCorrelationIds.current.add(response.data.correlationId);
        
        // Add to pending operations
        addPendingOperation(response.data.correlationId, {
          type: 'buildRelease',
          appId,
          startedAt: new Date().toISOString(),
          status: 'IN_PROGRESS'
        });
        
        return response.data.correlationId;
      }
      
      return response.data;
    } catch (err: any) {
      console.error('[apps-context] Error starting release build:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to start release build';
      throw err;
    }
  };

  const downloadBuild = async (appId: string, platform: string, buildId: string) => {
    try {
      console.log('[apps-context] Downloading build:', { appId, platform, buildId });
      
      const response = await appsAPI.downloadBuild(appId, platform, buildId);
      
      console.log('[apps-context] Download response:', response);

      if (response.data?.downloadUrl) {
        // In React Native, you would use a library like react-native-fs or expo-file-system
        // For now, just log the download URL
        console.log('Download URL:', response.data.downloadUrl);
      }
      
      return response.data;
    } catch (err: any) {
      console.error('[apps-context] Error downloading build:', err);
      
      const errorMessage = err.response?.data?.message || 'Failed to download build';
      throw err;
    }
  };

  const isInTrash = (appId: string) => {
    return state.apps.some(app => app.id === appId && app.isTrashed);
  };

  const getActiveApps = () => {
    return state.apps.filter(app => !app.isTrashed);
  };

  const getTrashedApps = () => {
    return state.trashedApps;
  };

  const getProgress = (correlationId: string) => {
    return state.progress[correlationId];
  };

  const clearProgress = (correlationId: string) => {
    dispatch({ type: CLEAR_PROGRESS, payload: correlationId });
  };

  const setCurrentProgressId = (correlationId: string | null) => {
    if (correlationId) {
      dispatch({ type: SET_CURRENT_PROGRESS_ID, payload: correlationId });
    } else {
      dispatch({ type: CLEAR_CURRENT_PROGRESS_ID });
    }
  };

  const subscribeToCorrelationIds = async (correlationIds: string[]) => {
    // In React Native, you would implement SSE or WebSocket connection here
    // For now, just add to tracking
    correlationIds.forEach(id => currentCorrelationIds.current.add(id));
    console.log('[apps-context] Subscribed to correlation IDs:', correlationIds);
  };

  const hasPendingBuildOperations = () => {
    const pendingOperations = Object.values(state.pendingOperations);
    return pendingOperations.some(operation => 
      operation.type === 'buildAAB' || 
      operation.type === 'buildDebug' || 
      operation.type === 'buildRelease'
    );
  };

  const clearAllAppsData = () => {
    console.log('[apps-context] Clearing all apps data due to user change');
    console.log('[apps-context] Previous state - apps:', state.apps.length, 'trashed:', state.trashedApps.length);
    console.log('[apps-context] Current progress ID:', state.currentProgressId);
    console.log('[apps-context] Progress entries:', Object.keys(state.progress).length);
    
    dispatch({ type: CLEAR_ALL_APPS_DATA });
    hasAttemptedFetch.current = false; // Reset fetch flag to allow new fetches
    
    // Ensure current progress ID is cleared
    dispatch({ type: CLEAR_CURRENT_PROGRESS_ID });
    
    console.log('[apps-context] Apps data cleared successfully');
  };

  // Pending operations methods
  const addPendingOperation = (correlationId: string, operation: any) => {
    dispatch({ 
      type: ADD_PENDING_OPERATION, 
      payload: { correlationId, operation } 
    });
  };

  const removePendingOperation = (correlationId: string) => {
    dispatch({ 
      type: REMOVE_PENDING_OPERATION, 
      payload: correlationId 
    });
  };

  const updatePendingOperation = (correlationId: string, updates: any) => {
    dispatch({ 
      type: UPDATE_PENDING_OPERATION, 
      payload: { correlationId, updates } 
    });
  };

  const showPendingOperationsDialog = () => {
    dispatch({ type: SHOW_PENDING_OPERATIONS_DIALOG });
  };

  const hidePendingOperationsDialog = () => {
    dispatch({ type: HIDE_PENDING_OPERATIONS_DIALOG });
  };

  const handleNavigationAttempt = (callback: () => void) => {
    const pendingOperations = Object.keys(state.pendingOperations);
    
    if (pendingOperations.length > 0) {
      showPendingOperationsDialog();
      // Store the callback to execute after user confirms
      pendingNavigationCallback.current = callback;
    } else {
      callback();
    }
  };

  const cancelAllPendingOperations = async () => {
    dispatch({ type: SET_CANCELLING_OPERATIONS, payload: true });
    
    try {
      const pendingOperations = Object.keys(state.pendingOperations);
      
      for (const correlationId of pendingOperations) {
        await cancelAppCreation(correlationId);
      }
      
      // Clear all pending operations
      pendingOperations.forEach(correlationId => {
        removePendingOperation(correlationId);
      });
      
      hidePendingOperationsDialog();
      
      // Execute the pending navigation callback if exists
      if (pendingNavigationCallback.current) {
        pendingNavigationCallback.current();
        pendingNavigationCallback.current = null;
      }
      
    } catch (error) {
      console.error('Failed to cancel pending operations:', error);
    } finally {
      dispatch({ type: SET_CANCELLING_OPERATIONS, payload: false });
    }
  };

  return (
    <AppsContext.Provider
      value={{
        ...state,
        fetchApps,
        fetchTrashedApps,
        fetchApp,
        refreshApps,
        createApp,
        updateApp,
        deleteApp,
        moveToTrash,
        restoreFromTrash,
        permanentDelete,
        emptyTrash,
        startBuild,
        buildAAB,
        buildDebug,
        buildRelease,
        downloadBuild,
        setSelectedApp,
        openModal,
        closeModal,
        setLoading,
        isInTrash,
        getActiveApps,
        getTrashedApps,
        getProgress,
        clearProgress,
        setCurrentProgressId,
        subscribeToCorrelationIds,
        hasPendingBuildOperations,
        cancelAppCreation,
        clearAllAppsData,
        addPendingOperation,
        removePendingOperation,
        updatePendingOperation,
        showPendingOperationsDialog,
        hidePendingOperationsDialog,
        handleNavigationAttempt,
        cancelAllPendingOperations
      }}
    >
      {children}
    </AppsContext.Provider>
  );
};

// Custom hook to use the AppsContext
export const useAppsContext = () => {
  const context = React.useContext(AppsContext);
  if (!context) {
    throw new Error('useAppsContext must be used within an AppsProvider');
  }
  return context;
};

export default AppsContext;
