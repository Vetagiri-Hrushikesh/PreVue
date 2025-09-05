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
} from './actions';

import { AppsState, AppsAction, AppData } from '../../types/app';

// Initial state
export const initialState: AppsState = {
  apps: [],
  trashedApps: [],
  selectedApp: null,
  loading: {
    fetch: false,
    create: false,
    update: false,
    delete: false,
    softDelete: false,
    recover: false,
    permanentDelete: false,
    fetchTrashed: false
  },
  error: null,
  modals: {
    create: false,
    update: false,
    delete: false,
    trash: false
  },
  progress: {},
  currentProgressId: null,
  pendingOperations: {},
  showPendingOperationsDialog: false,
  isCancellingOperations: false
};

// Reducer
const appsReducer = (state: AppsState = initialState, action: AppsAction): AppsState => {
  switch (action.type) {
    // Fetch Apps
    case FETCH_APPS:
      return {
        ...state,
        loading: { ...state.loading, fetch: true },
        error: null
      };

    case FETCH_APPS_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, fetch: false },
        apps: action.payload || [],
        error: null
      };

    case FETCH_APPS_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, fetch: false },
        error: action.payload
      };

    // Fetch Trashed Apps
    case FETCH_TRASHED_APPS:
      return {
        ...state,
        loading: { ...state.loading, fetchTrashed: true },
        error: null
      };

    case FETCH_TRASHED_APPS_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, fetchTrashed: false },
        trashedApps: action.payload || [],
        error: null
      };

    case FETCH_TRASHED_APPS_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, fetchTrashed: false },
        error: action.payload
      };

    // Create App
    case CREATE_APP:
      return {
        ...state,
        loading: { ...state.loading, create: true },
        error: null
      };

    case CREATE_APP_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, create: false },
        apps: [action.payload, ...state.apps],
        error: null
      };

    case CREATE_APP_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, create: false },
        error: action.payload
      };

    // Update App
    case UPDATE_APP:
      return {
        ...state,
        loading: { ...state.loading, update: true },
        error: null
      };

    case UPDATE_APP_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, update: false },
        apps: state.apps.map(app => 
          app.id === action.payload.id ? action.payload : app
        ),
        error: null
      };

    case UPDATE_APP_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, update: false },
        error: action.payload
      };

    // Delete App
    case DELETE_APP:
      return {
        ...state,
        loading: { ...state.loading, delete: true },
        error: null
      };

    case DELETE_APP_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, delete: false },
        apps: state.apps.filter(app => app.id !== action.payload),
        error: null
      };

    case DELETE_APP_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, delete: false },
        error: action.payload
      };

    // Soft Delete App
    case SOFT_DELETE_APP:
      return {
        ...state,
        loading: { ...state.loading, softDelete: true },
        error: null
      };

    case SOFT_DELETE_APP_OPTIMISTIC:
      return {
        ...state,
        loading: { ...state.loading, softDelete: true },
        apps: state.apps.map(app => 
          app.id === action.payload 
            ? { ...app, isTrashed: true, trashedAt: new Date().toISOString() }
            : app
        ),
        error: null
      };

    case SOFT_DELETE_APP_SUCCESS:
      if (typeof action.payload === 'string') {
        // Remove by ID
        return {
          ...state,
          loading: { ...state.loading, softDelete: false },
          apps: state.apps.filter(app => app.id !== action.payload),
          error: null
        };
      } else {
        // Update with new data
        return {
          ...state,
          loading: { ...state.loading, softDelete: false },
          apps: state.apps.map(app => 
            app.id === action.payload.id ? action.payload : app
          ),
          error: null
        };
      }

    case SOFT_DELETE_APP_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, softDelete: false },
        error: action.payload
      };

    case SOFT_DELETE_APP_ROLLBACK:
      return {
        ...state,
        loading: { ...state.loading, softDelete: false },
        apps: action.payload,
        error: null
      };

    // Recover App
    case RECOVER_APP:
      return {
        ...state,
        loading: { ...state.loading, recover: true },
        error: null
      };

    case RECOVER_APP_OPTIMISTIC:
      return {
        ...state,
        loading: { ...state.loading, recover: true },
        trashedApps: state.trashedApps.filter(app => app.id !== action.payload),
        error: null
      };

    case RECOVER_APP_SUCCESS:
      if (typeof action.payload === 'string') {
        // Remove from trashed and add to main apps
        const recoveredApp = state.trashedApps.find(app => app.id === action.payload);
        if (recoveredApp) {
          return {
            ...state,
            loading: { ...state.loading, recover: false },
            trashedApps: state.trashedApps.filter(app => app.id !== action.payload),
            apps: [{ ...recoveredApp, isTrashed: false, trashedAt: null }, ...state.apps],
            error: null
          };
        }
        return state;
      } else {
        // Update with new data
        return {
          ...state,
          loading: { ...state.loading, recover: false },
          trashedApps: state.trashedApps.filter(app => app.id !== action.payload.id),
          apps: [action.payload, ...state.apps],
          error: null
        };
      }

    case RECOVER_APP_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, recover: false },
        error: action.payload
      };

    case RECOVER_APP_ROLLBACK:
      return {
        ...state,
        loading: { ...state.loading, recover: false },
        trashedApps: action.payload,
        error: null
      };

    // Permanent Delete App
    case PERMANENT_DELETE_APP:
      return {
        ...state,
        loading: { ...state.loading, permanentDelete: true },
        error: null
      };

    case PERMANENT_DELETE_APP_OPTIMISTIC:
      return {
        ...state,
        loading: { ...state.loading, permanentDelete: true },
        trashedApps: state.trashedApps.map(app => 
          app.id === action.payload 
            ? { ...app, isDeleted: true, deletedAt: new Date().toISOString() }
            : app
        ),
        error: null
      };

    case PERMANENT_DELETE_APP_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, permanentDelete: false },
        trashedApps: state.trashedApps.filter(app => app.id !== action.payload),
        error: null
      };

    case PERMANENT_DELETE_APP_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, permanentDelete: false },
        error: action.payload
      };

    case PERMANENT_DELETE_APP_ROLLBACK:
      return {
        ...state,
        loading: { ...state.loading, permanentDelete: false },
        trashedApps: action.payload,
        error: null
      };

    // Update App from Sync
    case UPDATE_APP_FROM_SYNC:
      return {
        ...state,
        apps: state.apps.map(app => 
          app.id === action.payload.id ? action.payload : app
        )
      };

    // Selected App
    case SET_SELECTED_APP:
      return {
        ...state,
        selectedApp: action.payload
      };

    case CLEAR_SELECTED_APP:
      return {
        ...state,
        selectedApp: null
      };

    // Modal State
    case SET_MODAL_STATE:
      return {
        ...state,
        modals: { ...state.modals, ...action.payload }
      };

    // Loading State
    case SET_LOADING_STATE:
      return {
        ...state,
        loading: { ...state.loading, ...action.payload }
      };

    // Progress
    case UPDATE_PROGRESS:
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.payload.correlationId]: {
            status: action.payload.status,
            progress: action.payload.progress || 0,
            message: action.payload.message || '',
            stage: action.payload.stage,
            error: action.payload.error,
            data: action.payload.data
          }
        }
      };

    case CLEAR_PROGRESS:
      const { [action.payload]: removed, ...remainingProgress } = state.progress;
      return {
        ...state,
        progress: remainingProgress
      };

    case SET_CURRENT_PROGRESS_ID:
      return {
        ...state,
        currentProgressId: action.payload
      };

    case CLEAR_CURRENT_PROGRESS_ID:
      return {
        ...state,
        currentProgressId: null
      };

    // Clear All Apps Data
    case CLEAR_ALL_APPS_DATA:
      return {
        ...initialState
      };

    // Pending Operations
    case ADD_PENDING_OPERATION:
      return {
        ...state,
        pendingOperations: {
          ...state.pendingOperations,
          [action.payload.correlationId]: action.payload.operation
        }
      };

    case REMOVE_PENDING_OPERATION:
      const { [action.payload]: removedOp, ...remainingOps } = state.pendingOperations;
      return {
        ...state,
        pendingOperations: remainingOps
      };

    case UPDATE_PENDING_OPERATION:
      return {
        ...state,
        pendingOperations: {
          ...state.pendingOperations,
          [action.payload.correlationId]: {
            ...state.pendingOperations[action.payload.correlationId],
            ...action.payload.updates
          }
        }
      };

    // Pending Operations Dialog
    case SHOW_PENDING_OPERATIONS_DIALOG:
      return {
        ...state,
        showPendingOperationsDialog: true
      };

    case HIDE_PENDING_OPERATIONS_DIALOG:
      return {
        ...state,
        showPendingOperationsDialog: false
      };

    case SET_CANCELLING_OPERATIONS:
      return {
        ...state,
        isCancellingOperations: action.payload
      };

    default:
      return state;
  }
};

export default appsReducer;
