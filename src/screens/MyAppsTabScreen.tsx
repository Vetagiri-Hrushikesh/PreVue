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
import { Eye, SearchNormal1, Refresh } from 'iconsax-react-nativejs';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import useApps from '../hooks/useApps';
import { AppData } from '../types/app';
import AuthGuard from '../components/AuthGuard';
import { femuxerAPI } from '../api/femuxer';

const MyAppsTabScreen: React.FC = () => {
  const { user } = useAuth();
  const { 
    apps, 
    loading, 
    error, 
    fetchApps, 
    refreshApps
  } = useApps();
  
  const hasFetched = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null);
  const [buildingApps, setBuildingApps] = useState<Set<string>>(new Set());

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

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await refreshApps(user.id);
    }
    setRefreshing(false);
  };

  const handlePreview = async (app: AppData) => {
    Alert.alert(
      'Build App for Preview',
      `Would you like to build "${app.name}" for preview? This will generate an AAB file.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Build',
          onPress: async () => {
            try {
              // Add app to building set
              setBuildingApps(prev => new Set(prev).add(app.id));
              
              console.log(`[MyAppsTabScreen] Starting AAB build for app: ${app.name} (${app.id})`);
              
              // Call buildAAB from femuxer API
              const response = await femuxerAPI.buildAAB(app.id, {
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
              
              console.log(`[MyAppsTabScreen] AAB build response:`, response);
              
              if (response.success) {
                Alert.alert(
                  'Build Started',
                  `AAB build for "${app.name}" has been started successfully. You can track the progress in the app.`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(response.message || 'Build failed');
              }
              
            } catch (error: any) {
              console.error(`[MyAppsTabScreen] AAB build failed for app ${app.id}:`, error);
              Alert.alert(
                'Build Failed',
                `Failed to start AAB build for "${app.name}": ${error.message || 'Unknown error'}`,
                [{ text: 'OK' }]
              );
            } finally {
              // Remove app from building set
              setBuildingApps(prev => {
                const newSet = new Set(prev);
                newSet.delete(app.id);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAppItem = ({ item }: { item: AppData }) => (
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
        <Text style={styles.appDetailText}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.appDetailText}>
          Platforms: {item.platforms.join(', ')}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.previewButton,
          buildingApps.has(item.id) && styles.previewButtonBuilding
        ]}
        onPress={() => handlePreview(item)}
        disabled={buildingApps.has(item.id)}
      >
        {buildingApps.has(item.id) ? (
          <>
            <Refresh size={16} color={Colors.white} />
            <Text style={styles.previewButtonText}>Building...</Text>
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
    marginBottom: 12,
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
});

export default MyAppsTabScreen;
