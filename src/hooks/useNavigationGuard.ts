import { useCallback } from 'react';
import { Alert } from 'react-native';
import useApps from './useApps';

/**
 * Custom hook for handling navigation with pending operations guard
 * 
 * This hook provides a safe way to navigate when there are pending operations.
 * It will show a confirmation dialog if there are pending operations,
 * allowing the user to cancel them or continue anyway.
 */
export const useNavigationGuard = () => {
  const { 
    pendingOperations, 
    showPendingOperationsDialog, 
    cancelAllPendingOperations,
    isCancellingOperations 
  } = useApps();

  /**
   * Safely navigate to a new location
   * 
   * @param navigateFunction - Function that performs the navigation
   * @example
   * const { safeNavigate } = useNavigationGuard();
   * 
   * // For React Navigation
   * safeNavigate(() => navigation.navigate('Home'));
   * 
   * // For logout
   * safeNavigate(() => logout());
   */
  const safeNavigate = useCallback((navigateFunction: () => void) => {
    const hasPendingOperations = Object.keys(pendingOperations).length > 0;
    
    if (hasPendingOperations) {
      Alert.alert(
        'Pending Operations',
        'You have pending operations in progress. Do you want to cancel them and continue?',
        [
          {
            text: 'Stay Here',
            style: 'cancel',
            onPress: () => {
              console.log('[useNavigationGuard] User chose to stay on current screen');
            }
          },
          {
            text: 'Cancel Operations & Continue',
            style: 'destructive',
            onPress: async () => {
              console.log('[useNavigationGuard] User chose to cancel operations and continue');
              try {
                await cancelAllPendingOperations();
                navigateFunction();
              } catch (error) {
                console.error('[useNavigationGuard] Failed to cancel operations:', error);
                Alert.alert('Error', 'Failed to cancel operations. Please try again.');
              }
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      navigateFunction();
    }
  }, [pendingOperations, cancelAllPendingOperations]);

  /**
   * Safely navigate to app dashboard
   * 
   * @param appId - The app ID to navigate to
   * @param navigateFunction - Function that performs the navigation
   */
  const safeNavigateToApp = useCallback((appId: string, navigateFunction: (appId: string) => void) => {
    const hasPendingOperations = Object.keys(pendingOperations).length > 0;
    
    if (hasPendingOperations) {
      Alert.alert(
        'Pending Operations',
        'You have pending operations in progress. Do you want to cancel them and continue to the app?',
        [
          {
            text: 'Stay Here',
            style: 'cancel',
            onPress: () => {
              console.log('[useNavigationGuard] User chose to stay on current screen');
            }
          },
          {
            text: 'Cancel Operations & Continue',
            style: 'destructive',
            onPress: async () => {
              console.log('[useNavigationGuard] User chose to cancel operations and continue to app:', appId);
              try {
                await cancelAllPendingOperations();
                navigateFunction(appId);
              } catch (error) {
                console.error('[useNavigationGuard] Failed to cancel operations:', error);
                Alert.alert('Error', 'Failed to cancel operations. Please try again.');
              }
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      navigateFunction(appId);
    }
  }, [pendingOperations, cancelAllPendingOperations]);

  /**
   * Safely logout user
   * 
   * @param logoutFunction - Function that performs the logout
   */
  const safeLogout = useCallback((logoutFunction: () => void) => {
    const hasPendingOperations = Object.keys(pendingOperations).length > 0;
    
    if (hasPendingOperations) {
      Alert.alert(
        'Pending Operations',
        'You have pending operations in progress. Do you want to cancel them and logout?',
        [
          {
            text: 'Stay Logged In',
            style: 'cancel',
            onPress: () => {
              console.log('[useNavigationGuard] User chose to stay logged in');
            }
          },
          {
            text: 'Cancel Operations & Logout',
            style: 'destructive',
            onPress: async () => {
              console.log('[useNavigationGuard] User chose to cancel operations and logout');
              try {
                await cancelAllPendingOperations();
                logoutFunction();
              } catch (error) {
                console.error('[useNavigationGuard] Failed to cancel operations:', error);
                Alert.alert('Error', 'Failed to cancel operations. Please try again.');
              }
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      logoutFunction();
    }
  }, [pendingOperations, cancelAllPendingOperations]);

  /**
   * Check if navigation is safe (no pending operations)
   */
  const isNavigationSafe = useCallback((): boolean => {
    return Object.keys(pendingOperations).length === 0;
  }, [pendingOperations]);

  /**
   * Get pending operations count
   */
  const getPendingOperationsCount = useCallback((): number => {
    return Object.keys(pendingOperations).length;
  }, [pendingOperations]);

  /**
   * Get pending operations summary
   */
  const getPendingOperationsSummary = useCallback((): string[] => {
    return Object.keys(pendingOperations).map(correlationId => {
      const operation = pendingOperations[correlationId];
      return operation?.operation || correlationId;
    });
  }, [pendingOperations]);

  return {
    safeNavigate,
    safeNavigateToApp,
    safeLogout,
    isNavigationSafe,
    getPendingOperationsCount,
    getPendingOperationsSummary,
    hasPendingOperations: Object.keys(pendingOperations).length > 0,
    isCancellingOperations
  };
};
