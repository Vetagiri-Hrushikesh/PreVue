// action - state management
import { REGISTER, LOGIN, LOGOUT, SET_LOADING, SET_ERROR, CLEAR_ERROR } from './actions';

// types
import { AuthProps, AuthActionProps, LoadingState, AuthError } from '../../types/auth';

// initial state
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

// ==============================|| AUTH REDUCER ||============================== //

const auth = (state = initialState, action: AuthActionProps) => {
  switch (action.type) {
    case REGISTER: {
      const { user } = action.payload as AuthProps;
      return {
        ...state,
        user
      };
    }
    case LOGIN: {
      const { user } = action.payload as AuthProps;
      return {
        ...state,
        isLoggedIn: true,
        isInitialized: true,
        user,
        error: null // Clear any previous errors
      };
    }
    case LOGOUT: {
      return {
        ...state,
        isInitialized: true,
        isLoggedIn: false,
        user: null,
        error: null,
        loading: {
          login: false,
          register: false,
          resetPassword: false,
          updateProfile: false,
          init: false
        }
      };
    }
    case SET_LOADING: {
      const loadingState = action.payload as LoadingState;
      return {
        ...state,
        loading: {
          ...state.loading,
          ...loadingState
        }
      };
    }
    case SET_ERROR: {
      const error = action.payload as AuthError;
      return {
        ...state,
        error
      };
    }
    case CLEAR_ERROR: {
      return {
        ...state,
        error: null
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default auth;
