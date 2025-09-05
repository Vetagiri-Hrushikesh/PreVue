import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, SearchNormal1, Refresh } from 'iconsax-react-nativejs';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import useApps from '../hooks/useApps';
import { useSSEContext } from '../contexts/SSEContext';
import { AppData } from '../types/app';
import { RootStackParamList } from '../types/navigation';
import AuthGuard from '../components/AuthGuard';
import CircularProgress from '../components/CircularProgress';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MyAppsTabScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { 
    apps, 
    loading, 
    error, 
    fetchApps, 
    refreshApps,
    getProgress,
    buildBundle,
    subscribeToCorrelationIds
  } = useApps();
  
  // SSE/WebSocket context for real-time updates
  const { 
    isConnected, 
    statusUpdates, 
    getStatus 
  } = useSSEContext();
  
  const hasFetched = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null);
  const [buildingApps, setBuildingApps] = useState<Set<string>>(new Set());
  const [buildProgress, setBuildProgress] = useState<Record<string, number>>({});
  const [buildMessages, setBuildMessages] = useState<Record<string, string>>({});
  const [correlationIds, setCorrelationIds] = useState<Record<string, string>>({});

  // Reset hasFetched flag when user changes
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    if (previousUserId.current && previousUserId.current !== currentUserId) {
      hasFetched.current = false;
    }
    
    previousUserId.current = currentUserId;
  }, [user?.id]);

  // Fetch apps when user is available
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (!hasFetched.current && !loading.fetch) {
      hasFetched.current = true;
      fetchApps(user.id);
    }
  }, [user?.id, fetchApps, loading.fetch]);

  // Monitor real-time progress updates from WebSocket
  useEffect(() => {
    statusUpdates.forEach((update: any, correlationId: string) => {
      console.log('🔄 [MyAppsTabScreen] Received WebSocket update:', {
        correlationId,
        status: update.status,
        message: update.message,
        data: update.data,
        error: update.error,
        timestamp: update.timestamp
      });
      
      // Find the app ID for this correlation ID
      const appId = Object.keys(correlationIds).find(id => correlationIds[id] === correlationId);
      
      if (appId) {
        console.log(`🎯 [MyAppsTabScreen] Processing update for app ${appId} (${correlationId})`);
        
        if (update.status === 'IN_PROGRESS') {
          // Use the progress percentage from update.data.progress (like web app)
          const progressPercentage = update.data?.progress || 0;
          const progressMessage = update.message || update.data?.stage || 'Building...';
          
          setBuildProgress(prev => ({ ...prev, [appId]: progressPercentage }));
          setBuildMessages(prev => ({ ...prev, [appId]: progressMessage }));
          
          console.log(`📊 [MyAppsTabScreen] Progress Update - App: ${appId}, Progress: ${progressPercentage}%, Message: "${progressMessage}"`);
          console.log(`📊 [MyAppsTabScreen] Full progress data:`, {
            appId,
            correlationId,
            progress: progressPercentage,
            message: progressMessage,
            stage: update.data?.stage,
            status: update.status
          });
        } else if (update.status === 'COMPLETED') {
          setBuildProgress(prev => ({ ...prev, [appId]: 100 }));
          setBuildMessages(prev => ({ ...prev, [appId]: update.message || 'Build completed!' }));
          
          console.log(`✅ [MyAppsTabScreen] Build COMPLETED for app ${appId}`);
          console.log(`✅ [MyAppsTabScreen] Completion data:`, {
            appId,
            correlationId,
            message: update.message,
            data: update.data
          });
          
          // Extract download URL from completion data
          const downloadUrl = update.data?.downloadUrl || update.data?.bundleUrl || update.data?.url;
          const app = apps.find(a => a.id === appId);
          
          console.log(`🔍 [MyAppsTabScreen] Checking for download URL in:`, {
            downloadUrl: update.data?.downloadUrl,
            bundleUrl: update.data?.bundleUrl,
            url: update.data?.url,
            allData: update.data
          });
          
          if (downloadUrl && app) {
            console.log(`🔗 [MyAppsTabScreen] Download URL found: ${downloadUrl}`);
            console.log(`📱 [MyAppsTabScreen] Navigating to PreviewScreen for app: ${app.name}`);
            
            // Navigate to PreviewScreen with the download URL
            navigation.navigate('Preview', {
              appId: app.id,
              appName: app.name,
              bundleUrl: downloadUrl
            });
          } else {
            console.log(`⚠️ [MyAppsTabScreen] No download URL found in completion data`);
            console.log(`⚠️ [MyAppsTabScreen] Available data keys:`, Object.keys(update.data || {}));
            console.log(`⚠️ [MyAppsTabScreen] Full data object:`, JSON.stringify(update.data, null, 2));
            
            // For testing, let's create a mock URL to see if the download works
            if (app) {
              console.log(`🧪 [MyAppsTabScreen] Creating mock URL for testing...`);
              const mockUrl = `https://httpbin.org/delay/2`; // This will return a simple response after 2 seconds
              navigation.navigate('Preview', {
                appId: app.id,
                appName: app.name,
                bundleUrl: mockUrl
              });
            } else {
              console.error(`❌ [MyAppsTabScreen] App not found for ID: ${appId}`);
            }
          }
          
          // Clean up after completion
          setTimeout(() => {
            console.log(`🧹 [MyAppsTabScreen] Cleaning up completed build for app ${appId}`);
            setBuildingApps(prev => {
              const newSet = new Set(prev);
              newSet.delete(appId);
              return newSet;
            });
            setBuildProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[appId];
              return newProgress;
            });
            setBuildMessages(prev => {
              const newMessages = { ...prev };
              delete newMessages[appId];
              return newMessages;
            });
            setCorrelationIds(prev => {
              const newIds = { ...prev };
              delete newIds[appId];
              return newIds;
            });
          }, 2000);
        } else if (update.status === 'FAILED') {
          console.log(`❌ [MyAppsTabScreen] Build FAILED for app ${appId}`);
          console.log(`❌ [MyAppsTabScreen] Failure data:`, {
            appId,
            correlationId,
            error: update.error,
            message: update.message,
            data: update.data
          });
          
          // Clean up on failure
          setBuildingApps(prev => {
            const newSet = new Set(prev);
            newSet.delete(appId);
            return newSet;
          });
          setBuildProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[appId];
            return newProgress;
          });
          setBuildMessages(prev => {
            const newMessages = { ...prev };
            delete newMessages[appId];
            return newMessages;
          });
          setCorrelationIds(prev => {
            const newIds = { ...prev };
            delete newIds[appId];
            return newIds;
          });
        } else if (update.status === 'CANCELLED') {
          console.log(`🚫 [MyAppsTabScreen] Build CANCELLED for app ${appId}`);
          
          // Clean up on cancellation
          setBuildingApps(prev => {
            const newSet = new Set(prev);
            newSet.delete(appId);
            return newSet;
          });
          setBuildProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[appId];
            return newProgress;
          });
          setBuildMessages(prev => {
            const newMessages = { ...prev };
            delete newMessages[appId];
            return newMessages;
          });
          setCorrelationIds(prev => {
            const newIds = { ...prev };
            delete newIds[appId];
            return newIds;
          });
        }
      } else {
        console.log(`⚠️ [MyAppsTabScreen] Received update for unknown correlation ID: ${correlationId}`);
        console.log(`⚠️ [MyAppsTabScreen] Current correlation IDs:`, correlationIds);
      }
    });
  }, [statusUpdates, correlationIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await refreshApps(user.id);
    }
    setRefreshing(false);
  };

  const handlePreview = async (app: AppData) => {
    try {
      // Add app to building set and initialize progress
      setBuildingApps(prev => new Set(prev).add(app.id));
      setBuildProgress(prev => ({ ...prev, [app.id]: 0 }));
      setBuildMessages(prev => ({ ...prev, [app.id]: 'Starting build...' }));
      
      console.log(`[MyAppsTabScreen] Starting bundle build for app: ${app.name} (${app.id})`);
      
      // Call buildBundle from useApps hook (proper pattern like web app)
      const correlationId = await buildBundle(app.id, {
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
      
      console.log(`[MyAppsTabScreen] Bundle build started with correlation ID:`, correlationId);
      
      if (correlationId) {
        
        // Store correlation ID for this app
        setCorrelationIds(prev => ({ ...prev, [app.id]: correlationId }));
        
        console.log(`🚀 [MyAppsTabScreen] Bundle build started successfully for app: ${app.name}`);
        console.log(`🆔 [MyAppsTabScreen] Correlation ID: ${correlationId}`);
        console.log(`📡 [MyAppsTabScreen] Subscribing to WebSocket updates for correlation ID: ${correlationId}`);
        
        // Subscribe to real-time updates for this correlation ID
        await subscribeToCorrelationIds([correlationId]);
        
        console.log(`✅ [MyAppsTabScreen] WebSocket subscription successful for correlation ID: ${correlationId}`);
        console.log(`📊 [MyAppsTabScreen] Waiting for real-time bundle build progress updates...`);
      } else {
        console.error(`❌ [MyAppsTabScreen] Build failed - no correlation ID received`);
        throw new Error('Build failed - no correlation ID received');
      }
      
    } catch (error: any) {
      console.error(`[MyAppsTabScreen] Bundle build failed for app ${app.id}:`, error);
      
      // Clean up on error
      setBuildingApps(prev => {
        const newSet = new Set(prev);
        newSet.delete(app.id);
        return newSet;
      });
      setBuildProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[app.id];
        return newProgress;
      });
      setBuildMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[app.id];
        return newMessages;
      });
      setCorrelationIds(prev => {
        const newIds = { ...prev };
        delete newIds[app.id];
        return newIds;
      });
    }
  };

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAppItem = ({ item }: { item: AppData }) => {
    const isBuilding = buildingApps.has(item.id);
    const hasAnyBuilding = buildingApps.size > 0;
    const progress = buildProgress[item.id] || 0;
    const message = buildMessages[item.id] || '';

    return (
      <TouchableOpacity
        style={styles.appItem}
        onPress={() => setSelectedApp(item)}
        activeOpacity={0.7}
      >
        <View style={styles.appHeader}>
          <View style={styles.appInfo}>
            <Text style={styles.appName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.appDescription} numberOfLines={2}>
              {item.description || 'No description available'}
            </Text>
          </View>
          <View style={styles.appStatus}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.isArchived ? Colors.warning + '20' : Colors.success + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.isArchived ? Colors.warning : Colors.success }
              ]}>
                {item.isArchived ? 'Archived' : 'Active'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.appDetails}>
          <View style={styles.leftColumn}>
            <Text style={styles.appDetailText}>
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.appDetailText}>
              Platforms: {item.platforms.join(', ')}
            </Text>
          </View>
          
          {/* Right Column - Circular Progress Bar */}
          <View style={styles.rightColumn}>
            {isBuilding && (
              <View style={styles.progressContainer}>
                <CircularProgress
                  progress={progress}
                  size={40}
                  strokeWidth={3}
                  color={Colors.primary}
                  backgroundColor={Colors.gray[300]}
                  showPercentage={true}
                />
                {message && (
                  <Text style={styles.progressMessage} numberOfLines={1}>
                    {message}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.previewButton,
            isBuilding && styles.previewButtonBuilding,
            hasAnyBuilding && !isBuilding && styles.previewButtonDisabled
          ]}
          onPress={() => handlePreview(item)}
          disabled={isBuilding || hasAnyBuilding}
        >
                          {isBuilding ? (
                  <>
                    <Refresh size={16} color={Colors.white} />
                    <Text style={styles.previewButtonText}>Bundling...</Text>
                  </>
                ) : (
                  <>
                    <Eye size={16} color={Colors.white} />
                    <Text style={styles.previewButtonText}>Preview</Text>
                  </>
                )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading.fetch && !hasFetched.current) {
    return (
      <AuthGuard>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your apps...</Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading apps</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => user?.id && fetchApps(user.id)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container}>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <SearchNormal1 size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Apps List */}
        {filteredApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No apps found matching your search' : 'No apps found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search terms' : 'Your apps will appear here'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredApps}
            renderItem={renderAppItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  appItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appInfo: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  appStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  appDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  appDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  previewButtonBuilding: {
    backgroundColor: Colors.warning,
  },
  previewButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  previewButtonDisabled: {
    backgroundColor: Colors.gray[400],
    opacity: 0.6,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMessage: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 60,
  },
});

export default MyAppsTabScreen;
