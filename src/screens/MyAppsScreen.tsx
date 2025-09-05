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
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import useApps from '../hooks/useApps';
import PendingOperationsDialog from '../components/PendingOperationsDialog';
import { AppData } from '../types/app';
import AuthGuard from '../components/AuthGuard';

interface Props {
  navigation: any;
}

const MyAppsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { 
    apps, 
    loading, 
    error, 
    fetchApps, 
    refreshApps, 
    getProgress, 
    clearProgress, 
    currentProgressId, 
    setCurrentProgressId 
  } = useApps();
  
  const hasFetched = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null);
  const [showAppDetails, setShowAppDetails] = useState(false);
  const [showPendingOperationsDialog, setShowPendingOperationsDialog] = useState(false);

  // Reset hasFetched flag when user changes
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // If user changed, reset the hasFetched flag
    if (previousUserId.current && previousUserId.current !== currentUserId) {
      console.log('[my-apps] User changed, resetting fetch flag');
      hasFetched.current = false;
    }
    
    previousUserId.current = currentUserId;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      console.warn('[my-apps] Skipping app fetch: user ID is undefined');
      return;
    }

    // Only fetch once
    if (!hasFetched.current && !loading.fetch) {
      hasFetched.current = true;
      fetchApps(user.id);
    }
  }, [user?.id, fetchApps, loading.fetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (user?.id) {
        await refreshApps(user.id);
      }
    } catch (error) {
      console.error('Error refreshing apps:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    if (user?.id) {
      refreshApps(user.id);
    }
  };

  const handleAppPress = (app: AppData) => {
    setSelectedApp(app);
    setShowAppDetails(true);
  };

  const handleCreateApp = () => {
    Alert.alert('Create App', 'App creation functionality will be implemented in the next phase');
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAppItem = ({ item }: { item: AppData }) => (
    <TouchableOpacity 
      style={styles.appItem} 
      onPress={() => handleAppPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.appHeader}>
        <Text style={styles.appName}>{item.name}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.isPublished ? Colors.success : Colors.warning }
        ]}>
          <Text style={styles.statusText}>
            {item.isPublished ? 'Published' : 'Unpublished'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.appId}>ID: {item.id}</Text>
      <Text style={styles.appEmail}>Owner: {item.ownerEmail}</Text>
      
      <View style={styles.appFooter}>
        <Text style={styles.platforms}>
          Platforms: {item.platforms.join(', ')}
        </Text>
        <Text style={styles.createdAt}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderAppDetails = () => (
    <Modal
      visible={showAppDetails}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>App Details</Text>
          <TouchableOpacity 
            onPress={() => setShowAppDetails(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        
        {selectedApp && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{selectedApp.name}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>ID:</Text>
              <Text style={styles.detailValue}>{selectedApp.id}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Owner Email:</Text>
              <Text style={styles.detailValue}>{selectedApp.ownerEmail}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Initial URL:</Text>
              <Text style={styles.detailValue}>{selectedApp.initialUrl}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Platforms:</Text>
              <Text style={styles.detailValue}>{selectedApp.platforms.join(', ')}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>
                {selectedApp.isPublished ? 'Published' : 'Unpublished'}
              </Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Version:</Text>
              <Text style={styles.detailValue}>{selectedApp.version}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Created At:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedApp.createdAt).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Updated At:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedApp.updatedAt).toLocaleString()}
              </Text>
            </View>
            
            {selectedApp.description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{selectedApp.description}</Text>
              </View>
            )}
            
            {selectedApp.tags && selectedApp.tags.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Tags:</Text>
                <Text style={styles.detailValue}>{selectedApp.tags.join(', ')}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Show loading state while fetching
  if (loading.fetch || !user?.id) {
    return (
      <AuthGuard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your apps...</Text>
        </View>
      </AuthGuard>
    );
  }

  // Show error state for critical system errors
  if (error) {
    return (
      <AuthGuard>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Critical Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Apps</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateApp}>
            <Text style={styles.createButtonText}>Create App</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {currentProgressId && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Operation in progress: {getProgress(currentProgressId)?.message || 'Processing...'}
            </Text>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {filteredApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No apps found' : 'No apps yet'}
            </Text>
            <Text style={styles.emptyMessage}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first app to get started'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.createFirstButton} onPress={handleCreateApp}>
                <Text style={styles.createFirstButtonText}>Create Your First App</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredApps}
            renderItem={renderAppItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}

        {renderAppDetails()}
        
        {/* Pending Operations Dialog */}
        <PendingOperationsDialog
          visible={showPendingOperationsDialog}
          onClose={() => setShowPendingOperationsDialog(false)}
        />
      </SafeAreaView>
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[300],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[300],
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  progressText: {
    color: Colors.white,
    fontSize: 14,
    marginRight: 8,
  },
  listContainer: {
    padding: 20,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  appId: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  appEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  appFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platforms: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  createdAt: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[300],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});

export default MyAppsScreen;
