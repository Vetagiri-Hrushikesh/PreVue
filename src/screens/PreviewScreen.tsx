import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { requireNativeComponent } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';

const PreviewView = requireNativeComponent<any>('PreviewView');

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

/**
 * PreviewScreen - Preview of embedded React Native apps with dynamic bundle loading
 */
const PreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appId, appName, bundleUrl } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparing preview...');

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setDownloadProgress(0);
    
    console.log(`🔍 [PreviewScreen] Received parameters:`, {
      appId,
      appName,
      bundleUrl
    });
    
    if (bundleUrl) {
      setLoadingMessage('Downloading app bundle...');
      console.log(`📥 [PreviewScreen] Starting download from: ${bundleUrl}`);
      // The native component will handle the download and extraction
      // We'll show progress updates from the native side
    } else {
      setLoadingMessage('Loading preview...');
      console.log(`⚠️ [PreviewScreen] No bundle URL provided, using fallback`);
      // Fallback to static bundle
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [appId, bundleUrl]);

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
    setIsLoading(true);
    setHasError(false);
    setDownloadProgress(0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
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
            {bundleUrl && downloadProgress > 0 && (
              <>
                <Text style={styles.loadingSubtext}>
                  {downloadProgress < 100 ? `Downloading... ${downloadProgress}%` : 'Extracting bundle...'}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
                </View>
              </>
            )}
            {!bundleUrl && (
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
