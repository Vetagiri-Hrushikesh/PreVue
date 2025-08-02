import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { requireNativeComponent } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';

const PreviewView = requireNativeComponent<any>('PreviewView');

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

/**
 * PreviewScreen - Simple preview of embedded React Native apps
 */
const PreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { appId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [appId]);

  const handlePreviewError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const retryPreview = () => {
    setIsLoading(true);
    setHasError(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Preview: {appId}</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading preview...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we prepare your app</Text>
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
        
        {/* Simple PreviewView */}
        <PreviewView 
          componentName={appId} 
          style={[
            styles.previewView, 
            (isLoading || hasError) && styles.previewViewHidden
          ]}
          onError={handlePreviewError}
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
});

export default PreviewScreen;
