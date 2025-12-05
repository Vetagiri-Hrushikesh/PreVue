import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { requireNativeComponent } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import useApps from '../hooks/useApps';
import { useSSEContext } from '../contexts/SSEContext';

const PreviewView = requireNativeComponent<any>('PreviewView');

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

/**
 * PreviewScreen - Preview of embedded React Native apps with dynamic bundle loading
 * 
 * Auto-triggers bundle build if bundleUrl is missing 
 */
const PreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appId, appName, bundleUrl: initialBundleUrl } = route.params;
  const { isLoggedIn } = useAuth();
  const { buildBundle, subscribeToCorrelationIds } = useApps();
  const { statusUpdates, isConnected } = useSSEContext();
  
  const [bundleUrl, setBundleUrl] = useState<string | undefined>(initialBundleUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparing preview...');

  // Build tracking state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildMessage, setBuildMessage] = useState('');
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const hasTriggeredBuild = useRef(false);

  // Guard: if user is not logged in, redirect to Login and remember target.
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.replace('Login', {
        redirectTo: 'Preview',
        redirectParams: {
          appId,
          appName,
          bundleUrl: initialBundleUrl
        }
      });
      return;
    }
  }, [isLoggedIn, navigation, appId, appName, initialBundleUrl]);

  // Auto-trigger bundle build if bundleUrl is missing 
  useEffect(() => {
    if (!isLoggedIn || !appId) {
      console.log(`⏸️ [PreviewScreen] Skipping build - isLoggedIn: ${isLoggedIn}, appId: ${appId}`);
      return;
    }

    // If we already have a bundleUrl, skip auto-build
    if (bundleUrl) {
      console.log(`✅ [PreviewScreen] Bundle URL already available, skipping auto-build: ${bundleUrl}`);
      return;
    }

    // Prevent multiple build triggers
    if (hasTriggeredBuild.current) {
      console.log(`⏸️ [PreviewScreen] Build already triggered, skipping duplicate`);
      return;
    }

    const triggerBuild = async () => {
      try {
        hasTriggeredBuild.current = true;
        setIsBuilding(true);
        setBuildProgress(0);
        setBuildMessage('Starting bundle build...');
        setLoadingMessage('Building app bundle...');
        setIsLoading(true);
        setHasError(false);

        console.log(`🚀 [PreviewScreen] Auto-triggering bundle build for app: ${appId}`);
        console.log(`🔍 [PreviewScreen] WebSocket connected: ${isConnected}`);

        // Trigger the build - this sends the request to AppGen via FeMuxer API
        console.log(`📤 [PreviewScreen] Calling buildBundle API...`);
        const buildCorrelationId = await buildBundle(appId, {
          verbose: true,
          force: false,
          clean: true,
          signing: {
            release: false // Use debug signing for preview
          },
          bundle: {
            split: false,
            universal: true
          }
        });

        console.log(`📥 [PreviewScreen] buildBundle response:`, buildCorrelationId);

        if (buildCorrelationId) {
          setCorrelationId(buildCorrelationId);
          console.log(`✅ [PreviewScreen] Bundle build started with correlation ID: ${buildCorrelationId}`);
          console.log(`📡 [PreviewScreen] WebSocket connected: ${isConnected}, subscribing to updates...`);
          
          // Subscribe to WebSocket updates for this build
          // This will work even if WebSocket isn't connected yet (it will auto-subscribe when connected)
          await subscribeToCorrelationIds([buildCorrelationId]);
          console.log(`✅ [PreviewScreen] Subscribed to WebSocket updates for correlation ID: ${buildCorrelationId}`);
        } else {
          console.error(`❌ [PreviewScreen] Build failed - no correlation ID received`);
          throw new Error('Build failed - no correlation ID received');
        }
      } catch (error: any) {
        console.error(`❌ [PreviewScreen] Failed to trigger bundle build:`, error);
        console.error(`❌ [PreviewScreen] Error details:`, {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        setHasError(true);
        setIsLoading(false);
        setIsBuilding(false);
        setLoadingMessage(`Failed to start bundle build: ${error.message || 'Unknown error'}`);
        hasTriggeredBuild.current = false; // Allow retry
      }
    };

    triggerBuild();
    // Remove function dependencies to prevent infinite loops - functions are stable from context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, appId, bundleUrl, isConnected]);

  // Monitor WebSocket updates for build progress
  useEffect(() => {
    if (!correlationId || !statusUpdates) {
      return;
    }

    const update = statusUpdates.get(correlationId);
    if (!update) {
      return;
    }

    console.log(`📊 [PreviewScreen] Build update received:`, {
      correlationId,
      status: update.status,
      progress: update.data?.progress,
      message: update.message
    });

    if (update.status === 'IN_PROGRESS') {
      const progressPercentage = update.data?.progress || 0;
      const progressMessage = update.message || update.data?.stage || 'Building...';
      
      setBuildProgress(progressPercentage);
      setBuildMessage(progressMessage);
      setLoadingMessage(`Building app bundle... ${progressPercentage}%`);
    } else if (update.status === 'COMPLETED') {
      setBuildProgress(100);
      setBuildMessage('Build completed!');
      setLoadingMessage('Build completed! Preparing preview...');

      // Extract download URL from completion data
      const downloadUrl = update.data?.downloadUrl || update.data?.bundleUrl || update.data?.url;
      
      console.log(`✅ [PreviewScreen] Build completed! Download URL:`, downloadUrl);

      if (downloadUrl) {
        console.log(`🔗 [PreviewScreen] Setting bundle URL: ${downloadUrl}`);
        setBundleUrl(downloadUrl);
        setIsBuilding(false);
        setLoadingMessage('Downloading app bundle...');
      } else {
        console.error(`❌ [PreviewScreen] Build completed but no download URL found`);
        setHasError(true);
        setIsLoading(false);
        setIsBuilding(false);
        setLoadingMessage('Build completed but no download URL available');
      }
    } else if (update.status === 'FAILED' || update.status === 'ERROR') {
      console.error(`❌ [PreviewScreen] Build failed:`, update.error || update.message);
      setHasError(true);
      setIsLoading(false);
      setIsBuilding(false);
      setLoadingMessage(update.error || update.message || 'Build failed');
      hasTriggeredBuild.current = false; // Allow retry
    }
  }, [correlationId, statusUpdates]);

  // Handle bundle download when bundleUrl is available
  useEffect(() => {
    if (!isLoggedIn || !bundleUrl) {
      return;
    }

    // Only proceed if we're not building (build is complete)
    if (isBuilding) {
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setDownloadProgress(0);
    
    console.log(`📥 [PreviewScreen] Starting download from: ${bundleUrl}`);
      setLoadingMessage('Downloading app bundle...');
      // The native component will handle the download and extraction
      // We'll show progress updates from the native side
  }, [bundleUrl, isLoggedIn, isBuilding]);

  const handlePreviewError = (event: any) => {
    const message = event.nativeEvent?.message || event.message || 'Unknown error';
    console.log(`❌ [PreviewScreen] Preview error: ${message}`);
    setHasError(true);
    setIsLoading(false);
  };

  const handleDownloadProgress = (event: any) => {
    const progress = event.nativeEvent?.progress || event.progress || event;
    console.log(`📊 [PreviewScreen] Download progress: ${progress}%`);
    setDownloadProgress(progress);
    if (progress >= 100) {
      setLoadingMessage('Extracting and preparing app...');
    }
  };

  const handlePreviewReady = (event: any) => {
    console.log(`✅ [PreviewScreen] Preview ready!`);
    setIsLoading(false);
    setDownloadProgress(100);
  };

  const retryPreview = () => {
    // Reset build trigger flag to allow retry
    hasTriggeredBuild.current = false;
    setIsLoading(true);
    setHasError(false);
    setDownloadProgress(0);
    setBuildProgress(0);
    setBuildMessage('');
    setCorrelationId(null);
    setBundleUrl(undefined); // This will trigger auto-build again
  };

  // While redirecting unauthenticated users, avoid rendering the preview UI.
  if (!isLoggedIn) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            // If there's a previous screen, go back
            // Otherwise (deep link scenario), replace with MainTabs
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              // Replace current screen with MainTabs
              // This works when PreviewScreen is opened via deep link
              navigation.replace('MainTabs');
            }
          }} 
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Preview: {appName || appId}</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            
            {/* Show build progress if building */}
            {isBuilding && (
              <>
                <Text style={styles.loadingSubtext}>
                  {buildMessage || `Building... ${buildProgress}%`}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${buildProgress}%` }]} />
                </View>
              </>
            )}
            
            {/* Show download progress if bundle is downloading */}
            {!isBuilding && bundleUrl && downloadProgress > 0 && (
              <>
                <Text style={styles.loadingSubtext}>
                  {downloadProgress < 100 ? `Downloading... ${downloadProgress}%` : 'Extracting bundle...'}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
                </View>
              </>
            )}
            
            {/* Show generic message if waiting */}
            {!isBuilding && !bundleUrl && !downloadProgress && (
              <Text style={styles.loadingSubtext}>Please wait while we prepare your app</Text>
            )}
          </View>
        )}
        
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Failed to load preview</Text>
            <Text style={styles.errorText}>There was an issue loading the app preview</Text>
            <Pressable onPress={retryPreview} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}
        
        {/* Dynamic PreviewView */}
        <PreviewView 
          componentName={appName || appId}
          bundleUrl={bundleUrl}
          style={[
            styles.previewView, 
            (isLoading || hasError) && styles.previewViewHidden
          ]}
          onError={handlePreviewError}
          onDownloadProgress={handleDownloadProgress}
          onPreviewReady={handlePreviewReady}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: { 
    fontSize: 18, 
    color: Colors.primary,
    fontWeight: '500',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 60, // Same width as back button for centering
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  previewView: {
    flex: 1,
  },
  previewViewHidden: {
    display: 'none',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  nativePreviewView: { // Added style for the native PreviewView
    flex: 1,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});

export default PreviewScreen;
