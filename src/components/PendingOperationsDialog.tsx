import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import useApps from '../hooks/useApps';

interface PendingOperationsDialogProps {
  visible: boolean;
  onClose: () => void;
}

const PendingOperationsDialog: React.FC<PendingOperationsDialogProps> = ({
  visible,
  onClose
}) => {
  const {
    pendingOperations,
    isCancellingOperations,
    cancelAllPendingOperations,
    progress
  } = useApps();

  const handleCancelAll = async () => {
    Alert.alert(
      'Cancel All Operations',
      'Are you sure you want to cancel all pending operations? This action cannot be undone.',
      [
        {
          text: 'Keep Operations',
          style: 'cancel'
        },
        {
          text: 'Cancel All',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllPendingOperations();
              onClose();
            } catch (error) {
              console.error('[PendingOperationsDialog] Failed to cancel operations:', error);
              Alert.alert('Error', 'Failed to cancel operations. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getOperationDisplayName = (operation: any): string => {
    if (typeof operation === 'string') {
      return operation;
    }
    if (operation?.operation) {
      return operation.operation;
    }
    if (operation?.type) {
      return operation.type;
    }
    return 'Unknown Operation';
  };

  const getProgressInfo = (correlationId: string) => {
    const progressInfo = progress[correlationId];
    if (!progressInfo) {
      return { status: 'Pending', progress: 0, message: 'Waiting to start...' };
    }
    return {
      status: progressInfo.status,
      progress: progressInfo.progress || 0,
      message: progressInfo.message || progressInfo.stage || 'In progress...'
    };
  };

  const renderOperationItem = (correlationId: string, operation: any) => {
    const progressInfo = getProgressInfo(correlationId);
    const displayName = getOperationDisplayName(operation);

    return (
      <View key={correlationId} style={styles.operationItem}>
        <View style={styles.operationHeader}>
          <Text style={styles.operationName}>{displayName}</Text>
          <Text style={styles.correlationId}>ID: {correlationId.slice(0, 8)}...</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressInfo.progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progressInfo.progress}%</Text>
        </View>
        
        <Text style={styles.statusText}>
          Status: {progressInfo.status}
        </Text>
        <Text style={styles.messageText}>
          {progressInfo.message}
        </Text>
      </View>
    );
  };

  const pendingOperationsList = Object.entries(pendingOperations);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>Pending Operations</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {pendingOperationsList.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No pending operations</Text>
              </View>
            ) : (
              pendingOperationsList.map(([correlationId, operation]) =>
                renderOperationItem(correlationId, operation)
              )
            )}
          </ScrollView>

          {pendingOperationsList.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isCancellingOperations && styles.cancelButtonDisabled
                ]}
                onPress={handleCancelAll}
                disabled={isCancellingOperations}
              >
                {isCancellingOperations ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel All Operations</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666'
  },
  content: {
    maxHeight: 400,
    padding: 20
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  operationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff'
  },
  operationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  operationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  correlationId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginRight: 12
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
    minWidth: 40,
    textAlign: 'right'
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  messageText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic'
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonDisabled: {
    backgroundColor: '#ccc'
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default PendingOperationsDialog;
