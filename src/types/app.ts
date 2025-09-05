// ==============================|| TYPES - APP  ||============================== //

export interface AppProps {
  modal: boolean;
}

export interface AppData {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  initialUrl: string;
  appSourceCodePath: string;
  features: {
    iconEnabled: boolean;
    splashEnabled: boolean;
  };
  iosBundleId: string;
  androidPackageName: string;
  iconId: string;
  splashScreenId: string;
  buildId: string;
  version: number;
  collaborators: string[];
  platforms: Array<'ios' | 'android' | 'both'>;
  isArchived: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  tags: string[];
  comments: string[];
  description: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  isTrashed?: boolean;
  trashedAt?: string | null;
}

// Femuxer API Types
export interface FemuxerRequest {
  operation: string;
  data: Record<string, any>;
  metadata: {
    correlationId: string;
    timestamp: string;
    source: string;
    version: string;
    role?: string;
    userId?: string;
    dryRun?: boolean;
  };
}

export interface FemuxerResponse<T = any> {
  data: T & { correlationId?: string };
  message: string;
  success: boolean;
}

// Apps Context Types
export interface AppsState {
  apps: AppData[];
  trashedApps: AppData[];
  selectedApp: AppData | null;
  loading: {
    fetch: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    softDelete: boolean;
    recover: boolean;
    permanentDelete: boolean;
    fetchTrashed: boolean;
  };
  error: string | null;
  modals: {
    create: boolean;
    update: boolean;
    delete: boolean;
    trash: boolean;
  };
  progress: Record<string, {
    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    progress: number;
    message: string;
    stage?: string;
    error?: string;
    data?: any;
  }>;
  currentProgressId: string | null;
  pendingOperations: Record<string, {
    type: string;
    progress: number;
    message: string;
    startedAt: string;
    status?: string;
    appId?: string;
  }>;
  showPendingOperationsDialog: boolean;
  isCancellingOperations: boolean;
}

export interface AppsAction {
  type: string;
  payload?: any;
}

export interface AppsContextType extends Omit<AppsState, 'showPendingOperationsDialog'> {
  fetchApps: (ownerId: string) => Promise<void>;
  fetchTrashedApps: (ownerId: string) => Promise<void>;
  fetchApp: (appId: string) => Promise<AppData | null>;
  refreshApps: (ownerId: string) => Promise<void>;
  createApp: (appData: Partial<AppData>) => Promise<string | null>;
  updateApp: (appId: string, appData: Partial<AppData>) => Promise<void>;
  deleteApp: (appId: string) => Promise<void>;
  moveToTrash: (appId: string) => Promise<void>;
  restoreFromTrash: (appId: string) => Promise<void>;
  permanentDelete: (appId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  startBuild: (appId: string, buildConfig: any) => Promise<void>;
  buildAAB: (appId: string, options?: any) => Promise<string | null>;
  buildBundle: (appId: string, options?: any) => Promise<string | null>;
  buildDebug: (appId: string, options?: any) => Promise<string | null>;
  buildRelease: (appId: string, options?: any) => Promise<string | null>;
  downloadBuild: (appId: string, platform: string, buildId: string) => Promise<void>;
  setSelectedApp: (app: AppData | null) => void;
  openModal: (modalType: 'create' | 'update' | 'delete' | 'trash') => void;
  closeModal: (modalType: 'create' | 'update' | 'delete' | 'trash') => void;
  setLoading: (loadingType: keyof AppsState['loading'], value: boolean) => void;
  isInTrash: (appId: string) => boolean;
  getActiveApps: () => AppData[];
  getTrashedApps: () => AppData[];
  getProgress: (correlationId: string) => AppsState['progress'][string] | undefined;
  clearProgress: (correlationId: string) => void;
  setCurrentProgressId: (correlationId: string | null) => void;
  subscribeToCorrelationIds: (correlationIds: string[]) => Promise<void>;
  hasPendingBuildOperations: () => boolean;
  cancelAppCreation: (correlationId: string) => Promise<void>;
  clearAllAppsData: () => void;
  addPendingOperation: (correlationId: string, operation: any) => void;
  removePendingOperation: (correlationId: string) => void;
  updatePendingOperation: (correlationId: string, updates: any) => void;
  showPendingOperationsDialog: () => void;
  hidePendingOperationsDialog: () => void;
  handleNavigationAttempt: (callback: () => void) => void;
  cancelAllPendingOperations: () => Promise<void>;
}
