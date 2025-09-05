import { ReactElement } from 'react';

// ==============================|| TYPES - AUTH  ||============================== //

export type GuardProps = {
  children: ReactElement | null;
};

type UserProfile = {
  id?: string;
  email?: string;
  password?:string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: 'ADMIN' | 'OWNER' | 'DEVELOPER' | 'VIEWER' | 'USER';
  apps?: string[];
  dashboard?:Record<string,any>;
  extraPermissions?: string[];
  deniedPermissions?: string[];
  loginCount?: number;
  lastLoginAt?: string;
  locale?:string;
  timezone?:string;
  deletedAt?:string;
  createdAt?: string;
  updatedAt?: string;
};

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface LoadingState {
  login: boolean;
  register: boolean;
  resetPassword: boolean;
  updateProfile: boolean;
  init: boolean;
}

export interface AuthProps {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null;
  token?: string | null;
  loading?: LoadingState;
  error?: AuthError | null;
}

export interface AuthActionProps {
  type: string;
  payload?: AuthProps | LoadingState | AuthError;
}

export type JWTContextType = {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
  loading?: LoadingState;
  error?: AuthError | null;
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
};
