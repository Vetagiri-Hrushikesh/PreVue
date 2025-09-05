import { useEffect, useRef } from 'react';
import { useSSEContext } from '../contexts/SSEContext';

// Real-time sync hook for handling updates from other users/tabs
export const useRealTimeSync = (
  onAppUpdate: (updatedApp: any) => void,
  onAppDelete: (appId: string) => void,
  onAppCreate: (newApp: any) => void,
  onAppPermanentDelete: (appId: string) => void
) => {
  const { isConnected, statusUpdates } = useSSEContext();
  const isSubscribed = useRef(false);
  const lastProcessedUpdates = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isConnected || isSubscribed.current) {
      return;
    }

    console.log('[real-time-sync] Real-time sync connected, setting up listeners');
    isSubscribed.current = true;

    return () => {
      console.log('[real-time-sync] Cleaning up real-time sync listeners');
      isSubscribed.current = false;
    };
  }, [isConnected]);

  // Process status updates for real-time sync
  useEffect(() => {
    if (!isConnected || !isSubscribed.current) {
      return;
    }

    // Process each status update
    for (const [correlationId, statusUpdate] of statusUpdates.entries()) {
      // Skip if we've already processed this update
      if (lastProcessedUpdates.current.has(correlationId)) {
        continue;
      }

      // Mark as processed
      lastProcessedUpdates.current.add(correlationId);

      console.log('[real-time-sync] Processing status update:', {
        correlationId,
        status: statusUpdate.status,
        data: statusUpdate.data
      });

      // Handle different types of updates based on the operation type
      if (statusUpdate.data && statusUpdate.data.operation) {
        const { operation, appData, appId } = statusUpdate.data;

        switch (operation) {
          case 'createApp':
            if (statusUpdate.status === 'COMPLETED' && appData) {
              console.log('[real-time-sync] App created:', appData);
              onAppCreate(appData);
            }
            break;

          case 'updateApp':
            if (statusUpdate.status === 'COMPLETED' && appData) {
              console.log('[real-time-sync] App updated:', appData);
              onAppUpdate(appData);
            }
            break;

          case 'deleteApp':
          case 'moveToTrash':
            if (statusUpdate.status === 'COMPLETED' && appId) {
              console.log('[real-time-sync] App deleted/moved to trash:', appId);
              onAppDelete(appId);
            }
            break;

          case 'permanentDelete':
            if (statusUpdate.status === 'COMPLETED' && appId) {
              console.log('[real-time-sync] App permanently deleted:', appId);
              onAppPermanentDelete(appId);
            }
            break;

          case 'restoreFromTrash':
            if (statusUpdate.status === 'COMPLETED' && appData) {
              console.log('[real-time-sync] App restored from trash:', appData);
              onAppUpdate(appData);
            }
            break;

          default:
            console.log('[real-time-sync] Unhandled operation type:', operation);
        }
      }

      // Handle generic app updates
      if (statusUpdate.data && statusUpdate.data.app) {
        const app = statusUpdate.data.app;
        console.log('[real-time-sync] Generic app update received:', app);
        onAppUpdate(app);
      }
    }

    // Clean up old processed updates to prevent memory leaks
    if (lastProcessedUpdates.current.size > 100) {
      const updatesToKeep = new Set<string>();
      const recentUpdates = Array.from(statusUpdates.keys()).slice(-50);
      recentUpdates.forEach(id => updatesToKeep.add(id));
      lastProcessedUpdates.current = updatesToKeep;
    }
  }, [isConnected, statusUpdates, onAppUpdate, onAppDelete, onAppCreate, onAppPermanentDelete]);

  return {
    isConnected,
    isSubscribed: isSubscribed.current,
    statusUpdatesCount: statusUpdates.size
  };
};
