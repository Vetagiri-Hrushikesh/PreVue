import axios, { AxiosResponse } from 'axios';
import { FemuxerRequest, FemuxerResponse } from '../types/app';

// Constants - Updated to use your IP address
const FEMUXER_BASE_URL = 'http://192.168.0.3:5050/internal/api/femux/v1/process';
// You can set these to true if needed for testing
const dryRun = false;
const mockRun = false;

// Utility functions
function randomHex(len: number): string {
  let s = '';
  while (s.length < len) {
    s += Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  }
  return s.substring(0, len);
}

function generateTraceparent() {
  return ['00', randomHex(32), randomHex(16), '01'].join('-');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getCommonHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': 'anon-api-key-123',
    'Idempotency-Key': generateUUID(),
    'Cache-Control': 'no-cache',
    'X-Client-Version': '2.3.1',
    'X-Schema-Version': 'v1',
    'X-Dry-Run': dryRun.toString(),
    'X-Use-Mock': mockRun.toString(),
    traceparent: generateTraceparent(),
    tracestate: 'vendor_specific_state',
    'X-Forwarded-For': '127.0.0.1'
  };
}

function createFemuxerRequest(
  operation: string,
  data: Record<string, any>,
  customMetadata?: Partial<FemuxerRequest['metadata']>
): FemuxerRequest {
  return {
    operation,
    data,
    metadata: {
      correlationId: customMetadata?.correlationId || generateUUID(),
      timestamp: customMetadata?.timestamp || new Date().toISOString(),
      source: customMetadata?.source || 'client',
      version: customMetadata?.version || '1.0.0',
      ...customMetadata
    }
  };
}

// Centralized API service
export class FemuxerAPI {
  private static instance: FemuxerAPI;
  
  private constructor() {}
  
  public static getInstance(): FemuxerAPI {
    if (!FemuxerAPI.instance) {
      FemuxerAPI.instance = new FemuxerAPI();
    }
    return FemuxerAPI.instance;
  }

  /**
   * Generic method to make requests to Femuxer
   */
  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    operation: string,
    data: Record<string, any> = {},
    customMetadata?: Partial<FemuxerRequest['metadata']>
  ): Promise<FemuxerResponse<T>> {
    const headers = getCommonHeaders();
    const requestBody = createFemuxerRequest(operation, data, customMetadata);
    
    console.log(`[femuxer-api] ${method} ${operation}:`, JSON.stringify(requestBody, null, 2));
    console.log(`[femuxer-api] Request format check:`, {
      hasOperation: !!requestBody.operation,
      hasData: !!requestBody.data,
      hasMetadata: !!requestBody.metadata,
      dataKeys: Object.keys(requestBody.data),
      metadataKeys: Object.keys(requestBody.metadata)
    });
    
    try {
      let response: AxiosResponse<FemuxerResponse<T>>;
      
      switch (method) {
        case 'GET':
          response = await axios.get(FEMUXER_BASE_URL, { headers, params: requestBody });
          break;
        case 'POST':
          response = await axios.post(FEMUXER_BASE_URL, requestBody, { headers });
          break;
        case 'PUT':
          response = await axios.put(FEMUXER_BASE_URL, requestBody, { headers });
          break;
        case 'DELETE':
          response = await axios.delete(FEMUXER_BASE_URL, { headers, data: requestBody });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      console.log(`[femuxer-api] ${operation} response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[femuxer-api] ${operation} error:`, error);
      throw error;
    }
  }

  // Apps Operations
  async fetchApps(ownerId: string): Promise<FemuxerResponse<any[]>> {
    return this.makeRequest('POST', 'ui.app.list.request', {
      ownerId: ownerId,
      page: 1,
      pageSize: 20,
      includeDeleted: false,
      includeArchived: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filter: {
        // Remove all hardcoded filters to show all non-deleted apps
      },
      timeout: 5000
    }, {
      role: 'USER',
      userId: ownerId,
      correlationId: `req_list_${generateUUID()}`,
      dryRun: false
    });
  }

  async fetchTrashedApps(ownerId: string): Promise<FemuxerResponse<any[]>> {
    console.log('🔍 [DEVPORTAL-FemuxerAPI] Fetching trashed apps for owner:', ownerId);
    
    const requestData = {
      ownerId: ownerId,
      page: 1,
      pageSize: 100, // Increased to get more results
      sortBy: 'deletedAt',
      sortOrder: 'desc',
      // No filters to get all trashed apps
      timeout: 10000 // Increased timeout
    };
    
    console.log('🔍 [DEVPORTAL-FemuxerAPI] Trashed apps request data:', requestData);
    
    const response = await this.makeRequest('POST', 'ui.app.trashedlist.request', requestData, {
      role: 'USER',
      userId: ownerId,
      correlationId: `req_trashed_list_${generateUUID()}`,
      dryRun: false
    });
    
    console.log('🔍 [DEVPORTAL-FemuxerAPI] Trashed apps response:', response);
    
    return response;
  }

  async fetchApp(appId: string): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.app.getDetails.request', {
      appId
    }, {
      correlationId: 'get-app-details-123',
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
  }

  async createApp(appData: any): Promise<FemuxerResponse<any>> {
    console.log('🌐 [DEVPORTAL-FemuxerAPI] Creating app with data:', appData);
    console.log('🌐 [DEVPORTAL-FemuxerAPI] Making request to Femuxer service');
    
    // Use the flattened format that matches the working example
    const response = await this.makeRequest('POST', 'ui.app.create.request', appData, {
      correlationId: 'create-app-789',
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] Response received from Femuxer:', response);
    
    // For async operations, we need to handle correlation ID and wait for completion
    if (response.data?.correlationId) {
      console.log('🆔 [DEVPORTAL-FemuxerAPI] Received correlation ID for async operation:', response.data.correlationId);
      // Return the correlation ID for SSE handling
      return {
        data: { correlationId: response.data.correlationId },
        message: response.message || 'App creation started',
        success: true
      };
    }
    
    console.log('✅ [DEVPORTAL-FemuxerAPI] Returning synchronous response');
    return response;
  }

  async cancelAppCreation(correlationId: string): Promise<FemuxerResponse<any>> {
    console.log('🚫 [DEVPORTAL-FemuxerAPI] Cancelling app creation for correlation ID:', correlationId);
    
    const response = await this.makeRequest('POST', 'ui.app.cancel.request', {
      correlationId
    }, {
      correlationId: correlationId, // Use the original app creation correlationId
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] Cancellation response:', response);
    return response;
  }

  async updateApp(appId: string, appData: any): Promise<FemuxerResponse<any>> {
    console.log('🔄 [DEVPORTAL-FemuxerAPI] Updating app with data:', { appId, appData });
    
    const response = await this.makeRequest('POST', 'ui.app.update.request', {
      appId,
      ...appData
    }, {
      correlationId: `update-app-${appId}-${generateUUID()}`,
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] Update response:', response);
    return response;
  }

  async deleteApp(appId: string): Promise<FemuxerResponse<void>> {
    return this.makeRequest('POST', 'ui.app.delete.request', { appId });
  }

  async moveToTrash(appId: string): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.app.softDelete.request', { appId });
  }

  async restoreFromTrash(appId: string): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.app.restoreFromTrash.request', { 
      appId,
      isDeleted: false,
      deletedAt: null
    });
  }

  async permanentDelete(appId: string): Promise<FemuxerResponse<void>> {
    return this.makeRequest('POST', 'ui.app.permanentDelete.request', { appId });
  }

  async emptyTrash(): Promise<FemuxerResponse<void>> {
    return this.makeRequest('POST', 'ui.app.emptyTrash.request', {});
  }

  // Build-related methods
  async startBuild(appId: string, buildConfig: any): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.app.build.start.request', { 
      appId, 
      buildConfig,
      platforms: buildConfig.platforms.map((p: any) => p.id)
    });
  }

  async buildAAB(appId: string, options: any = {}): Promise<FemuxerResponse<any>> {
    console.log('🏗️ [DEVPORTAL-FemuxerAPI] Starting AAB build for app:', appId);
    
    const response = await this.makeRequest('POST', 'ui.app.buildBundle.request', {
      appId,
      options: {
        verbose: true,
        force: false,
        clean: true,
        signing: {
          release: true
        },
        bundle: {
          split: true,
          universal: false
        },
        ...options
      }
    }, {
      correlationId: `build-aab-${appId}-${generateUUID()}`,
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] AAB build response:', response);
    return response;
  }

  async buildDebug(appId: string, options: any = {}): Promise<FemuxerResponse<any>> {
    console.log('🐛 [DEVPORTAL-FemuxerAPI] Starting debug build for app:', appId);
    
    const response = await this.makeRequest('POST', 'ui.app.buildDebug.request', {
      appId,
      options: {
        verbose: true,
        force: false,
        clean: true,
        ...options
      }
    }, {
      correlationId: `build-debug-${appId}-${generateUUID()}`,
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] Debug build response:', response);
    return response;
  }

  async buildRelease(appId: string, options: any = {}): Promise<FemuxerResponse<any>> {
    console.log('🚀 [DEVPORTAL-FemuxerAPI] Starting release build for app:', appId);
    
    const response = await this.makeRequest('POST', 'ui.app.buildRelease.request', {
      appId,
      options: {
        verbose: true,
        force: false,
        clean: true,
        signing: {
          release: true
        },
        ...options
      }
    }, {
      correlationId: `build-release-${appId}-${generateUUID()}`,
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] Release build response:', response);
    return response;
  }

  async buildBundle(appId: string, options: any = {}): Promise<FemuxerResponse<any>> {
    console.log('📦 [DEVPORTAL-FemuxerAPI] Starting bundle build for app:', appId);
    
    const response = await this.makeRequest('POST', 'ui.app.bundle.request', {
      appId,
      options: {
        verbose: true,
        force: false,
        clean: true,
        bundle: {
          split: true,
          universal: false,
          optimize: true
        },
        ...options
      }
    }, {
      correlationId: `build-bundle-${appId}-${generateUUID()}`,
      timestamp: new Date().toISOString(),
      source: 'client',
      version: '1.0.0'
    });
    
    console.log('📥 [DEVPORTAL-FemuxerAPI] Bundle build response:', response);
    return response;
  }

  async getBuildStatus(appId: string, buildId: string): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.app.build.status.request', { appId, buildId });
  }

  async downloadBuild(appId: string, platform: string, buildId: string): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.app.build.download.request', { appId, platform, buildId });
  }

  // User Operations (example for future use)
  async fetchUser(userId: string): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.user.get.request', { userId });
  }

  async updateUser(userId: string, userData: any): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.user.update.request', { userId, ...userData });
  }

  // Billing Operations (example for future use)
  async fetchBillingHistory(userId: string): Promise<FemuxerResponse<any[]>> {
    return this.makeRequest('POST', 'ui.billing.history.request', { userId });
  }

  async createSubscription(userId: string, planData: any): Promise<FemuxerResponse<any>> {
    return this.makeRequest('POST', 'ui.billing.subscribe.request', { userId, ...planData });
  }

  // Generic method for custom operations
  async customOperation<T = any>(
    operation: string,
    data: Record<string, any> = {},
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    customMetadata?: Partial<FemuxerRequest['metadata']>
  ): Promise<FemuxerResponse<T>> {
    return this.makeRequest(method, operation, data, customMetadata);
  }
}

// Export singleton instance
export const femuxerAPI = FemuxerAPI.getInstance();

// Convenience functions for common operations
export const appsAPI = {
  fetch: (ownerId: string) => femuxerAPI.fetchApps(ownerId),
  fetchTrashed: (ownerId: string) => femuxerAPI.fetchTrashedApps(ownerId),
  fetchApp: (appId: string) => femuxerAPI.fetchApp(appId),
  create: (appData: any) => femuxerAPI.createApp(appData),
  cancelAppCreation: (correlationId: string) => femuxerAPI.cancelAppCreation(correlationId),
  update: (appId: string, appData: any) => femuxerAPI.updateApp(appId, appData),
  delete: (appId: string) => femuxerAPI.deleteApp(appId),
  moveToTrash: (appId: string) => femuxerAPI.moveToTrash(appId),
  restoreFromTrash: (appId: string) => femuxerAPI.restoreFromTrash(appId),
  permanentDelete: (appId: string) => femuxerAPI.permanentDelete(appId),
  emptyTrash: () => femuxerAPI.emptyTrash(),
  startBuild: (appId: string, buildConfig: any) => femuxerAPI.startBuild(appId, buildConfig),
  buildAAB: (appId: string, options: any) => femuxerAPI.buildAAB(appId, options),
  buildDebug: (appId: string, options: any) => femuxerAPI.buildDebug(appId, options),
  buildRelease: (appId: string, options: any) => femuxerAPI.buildRelease(appId, options),
  buildBundle: (appId: string, options: any) => femuxerAPI.buildBundle(appId, options),
  getBuildStatus: (appId: string, buildId: string) => femuxerAPI.getBuildStatus(appId, buildId),
  downloadBuild: (appId: string, platform: string, buildId: string) => femuxerAPI.downloadBuild(appId, platform, buildId)
};

export const usersAPI = {
  fetch: (userId: string) => femuxerAPI.fetchUser(userId),
  update: (userId: string, userData: any) => femuxerAPI.updateUser(userId, userData)
};

export const billingAPI = {
  fetchHistory: (userId: string) => femuxerAPI.fetchBillingHistory(userId),
  createSubscription: (userId: string, planData: any) => femuxerAPI.createSubscription(userId, planData)
};
