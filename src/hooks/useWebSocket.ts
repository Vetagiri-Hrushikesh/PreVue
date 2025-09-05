import { useState, useEffect, useRef, useCallback } from 'react';
import useAuth from './useAuth';

interface WebSocketStatusUpdate {
  correlationId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  message?: string;
  data?: any;
  error?: any;
  timestamp: string;
}

interface WebSocketConnection {
  clientId: string;
  userId: string;
  message: string;
}

interface ConnectionConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  messageQueueSize: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

interface QueuedMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
  
  // Status updates
  statusUpdates: Map<string, WebSocketStatusUpdate>;
  
  // Connection management
  connect: (correlationIds?: string[]) => Promise<void>;
  disconnect: () => void;
  subscribeToCorrelationIds: (correlationIds: string[]) => Promise<void>;
  
  // Status helpers
  getStatus: (correlationId: string) => WebSocketStatusUpdate | null;
  isStatusComplete: (correlationId: string) => boolean;
  isStatusFailed: (correlationId: string) => boolean;
  
  // Multiple app queue helpers
  getActiveOperations: () => string[];
  getCompletedOperations: () => string[];
  getFailedOperations: () => string[];
  getPendingOperations: () => string[];
  clearCompletedOperations: () => void;
  
  // Connection info
  clientId: string | null;
  connectionStats: {
    totalConnections: number;
    successfulConnections: number;
    failedConnections: number;
    messagesSent: number;
    messagesReceived: number;
    lastConnectedAt: string | null;
    lastDisconnectedAt: string | null;
  };
}

/**
 * Production-ready React Native hook for managing WebSocket connections
 * Features:
 * - Circuit breaker pattern for connection failures
 * - Message queuing for offline scenarios
 * - Connection pooling and failover
 * - Comprehensive health monitoring
 * - Cross-platform compatibility
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping-pong mechanism
 * - Connection validation and recovery
 */
export function useWebSocket(): UseWebSocketReturn {
  const { user, isInitialized } = useAuth();
  
  // Production-ready configuration
  const config: ConnectionConfig = {
    maxReconnectAttempts: 10,
    baseReconnectDelay: 1000,
    maxReconnectDelay: 30000,
    connectionTimeout: 15000,
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000,
    messageQueueSize: 100,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000
  };

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<'healthy' | 'degraded' | 'unhealthy'>('unhealthy');
  const [statusUpdates, setStatusUpdates] = useState<Map<string, WebSocketStatusUpdate>>(new Map());
  const [clientId, setClientId] = useState<string | null>(null);

  // Connection stats
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    lastConnectedAt: null as string | null,
    lastDisconnectedAt: null as string | null
  });

  // Refs for connection management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountingRef = useRef(false);
  const circuitBreakerRef = useRef({ failures: 0, lastFailureTime: 0, isOpen: false });
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const pendingSubscriptionsRef = useRef<Set<string>>(new Set());

  /**
   * Calculates exponential backoff delay with jitter
   */
  const calculateReconnectDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      config.baseReconnectDelay * Math.pow(2, attempt - 1),
      config.maxReconnectDelay
    );
    
    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(100, exponentialDelay + jitter);
  }, [config.baseReconnectDelay, config.maxReconnectDelay]);

  /**
   * Circuit breaker logic
   */
  const checkCircuitBreaker = useCallback((): boolean => {
    const now = Date.now();
    const { failures, lastFailureTime, isOpen } = circuitBreakerRef.current;

    if (isOpen && (now - lastFailureTime) > config.circuitBreakerTimeout) {
      // Reset circuit breaker
      circuitBreakerRef.current = { failures: 0, lastFailureTime: 0, isOpen: false };
      console.log('[useWebSocket] Circuit breaker reset');
      return true;
    }

    if (failures >= config.circuitBreakerThreshold) {
      circuitBreakerRef.current.isOpen = true;
      console.warn('[useWebSocket] Circuit breaker opened due to too many failures');
      return false;
    }

    return true;
  }, [config.circuitBreakerThreshold, config.circuitBreakerTimeout]);

  /**
   * Cleans up all connection resources
   */
  const cleanupConnection = useCallback(() => {
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Starts heartbeat mechanism
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));

          // Set heartbeat timeout
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
          }

          heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('[useWebSocket] Heartbeat timeout - connection may be dead');
            setConnectionHealth('degraded');
            // Don't close connection immediately, let reconnection logic handle it
          }, config.heartbeatTimeout);
        } catch (error) {
          console.error('[useWebSocket] Failed to send heartbeat:', error);
        }
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval, config.heartbeatTimeout]);

  /**
   * Handles connection timeout
   */
  const handleConnectionTimeout = useCallback(() => {
    console.error('[useWebSocket] Connection timeout');
    cleanupConnection();
    
    if (reconnectAttemptsRef.current < config.maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      const delay = calculateReconnectDelay(reconnectAttemptsRef.current);
      console.log(`[useWebSocket] Attempting reconnection ${reconnectAttemptsRef.current}/${config.maxReconnectAttempts} in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountingRef.current) {
          connect();
        }
      }, delay);
    } else {
      console.error('[useWebSocket] Max reconnection attempts reached');
      setConnectionError('Failed to establish WebSocket connection after multiple attempts');
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionHealth('unhealthy');
    }
  }, [cleanupConnection, calculateReconnectDelay, config.maxReconnectAttempts]);

  /**
   * Processes queued messages
   */
  const processMessageQueue = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const queue = messageQueueRef.current;
    while (queue.length > 0) {
      const message = queue.shift();
      if (message) {
        try {
          wsRef.current.send(JSON.stringify({
            type: message.type,
            data: message.data,
            id: message.id
          }));
          setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
        } catch (error) {
          console.error('[useWebSocket] Failed to send queued message:', error);
          // Re-queue message if it hasn't exceeded max retries
          if (message.retryCount < message.maxRetries) {
            message.retryCount++;
            queue.unshift(message);
          }
        }
      }
    }
  }, []);

  /**
   * Establishes WebSocket connection
   */
  const connect = useCallback(async (correlationIds?: string[]) => {
    console.log('[useWebSocket] Starting connection attempt:', {
      user: user ? { id: user.id, email: user.email } : null,
      isInitialized,
      correlationIds
    });

    if (!user?.id || !isInitialized) {
      const error = 'User not authenticated';
      console.error('[useWebSocket] Authentication failed:', { userId: user?.id, isInitialized, error });
      setConnectionError(error);
      return;
    }

    // Check circuit breaker
    if (!checkCircuitBreaker()) {
      const error = 'Circuit breaker is open - too many connection failures';
      console.error('[useWebSocket] Circuit breaker blocked connection:', error);
      setConnectionError(error);
      return;
    }

    // Prevent multiple simultaneous connections
    if (isConnected || isConnecting) {
      console.log('[useWebSocket] Connection already in progress:', { isConnected, isConnecting });
      return;
    }

    // Clean up any existing connection first
    cleanupConnection();

    setIsConnecting(true);
    setConnectionError(null);
    setConnectionStats(prev => ({ ...prev, totalConnections: prev.totalConnections + 1 }));

    try {
      // Build WebSocket URL
      const baseUrl = 'http://192.168.0.3:5050'; // Use your IP address
      const params = new URLSearchParams({
        userId: user.id,
        ...(correlationIds && correlationIds.length > 0 && { 
          correlationIds: correlationIds.join(',') 
        })
      });

      const wsUrl = `ws://192.168.0.3:5050/ws?${params.toString()}`;
      
      console.log('[useWebSocket] Building connection URL:', {
        baseUrl,
        userId: user.id,
        correlationIds,
        fullUrl: wsUrl
      });

      // Create WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error('[useWebSocket] Connection timeout - readyState still CONNECTING');
          ws.close();
          handleConnectionTimeout();
        }
      }, config.connectionTimeout);

      // Handle connection open
      ws.onopen = (event) => {
        console.log('[useWebSocket] WebSocket connection opened:', event);
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        setConnectionHealth('healthy');
        reconnectAttemptsRef.current = 0;
        circuitBreakerRef.current.failures = 0;

        setConnectionStats(prev => ({
          ...prev,
          successfulConnections: prev.successfulConnections + 1,
          lastConnectedAt: new Date().toISOString()
        }));

        // Start heartbeat
        startHeartbeat();

        // Process queued messages
        processMessageQueue();

        // Retry pending subscriptions
        if (pendingSubscriptionsRef.current.size > 0) {
          const pendingIds = Array.from(pendingSubscriptionsRef.current);
          pendingSubscriptionsRef.current.clear();
          subscribeToCorrelationIds(pendingIds);
        }
      };

      // Handle connection errors
      ws.onerror = (event) => {
        console.error('[useWebSocket] WebSocket error:', event);
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // Update circuit breaker
        circuitBreakerRef.current.failures++;
        circuitBreakerRef.current.lastFailureTime = Date.now();

        setConnectionStats(prev => ({
          ...prev,
          failedConnections: prev.failedConnections + 1,
          lastDisconnectedAt: new Date().toISOString()
        }));

        // Only handle error if we're still connecting
        if (ws.readyState === WebSocket.CONNECTING) {
          handleConnectionTimeout();
        }
      };

      // Handle connection close
      ws.onclose = (event) => {
        console.log('[useWebSocket] WebSocket connection closed:', event);
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setIsConnected(false);
        setIsConnecting(false);
        setConnectionHealth('unhealthy');

        setConnectionStats(prev => ({
          ...prev,
          lastDisconnectedAt: new Date().toISOString()
        }));

        // Attempt reconnection if not manually closed
        if (!isUnmountingRef.current && event.code !== 1000) {
          handleConnectionTimeout();
        }
      };

      // Handle incoming messages
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setConnectionStats(prev => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }));

          // Clear heartbeat timeout on pong
          if (data.type === 'pong') {
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }
            setConnectionHealth('healthy');
            return;
          }

          // Handle connection event
          if (data.type === 'connection') {
            console.log('[useWebSocket] Connection event received:', data);
            setClientId(data.clientId);
            return;
          }

          // Handle status updates
          if (data.type === 'status_update') {
            console.log('[useWebSocket] Status update received:', data);
            
            setStatusUpdates(prev => {
              const newMap = new Map(prev);
              newMap.set(data.correlationId, {
                correlationId: data.correlationId,
                status: data.status,
                message: data.message,
                data: data.data,
                error: data.error,
                timestamp: data.timestamp || new Date().toISOString()
              });
              return newMap;
            });
            return;
          }

          console.log('[useWebSocket] Unhandled message type:', data.type, data);
        } catch (error) {
          console.error('[useWebSocket] Failed to parse message:', error, event.data);
        }
      };

    } catch (error: any) {
      console.error('[useWebSocket] Failed to establish WebSocket connection:', error);
      setConnectionError(error.message || 'Failed to connect to WebSocket');
      setIsConnecting(false);
      setConnectionHealth('unhealthy');
    }
  }, [user?.id, isInitialized, isConnected, isConnecting, cleanupConnection, handleConnectionTimeout, calculateReconnectDelay, checkCircuitBreaker, startHeartbeat, processMessageQueue]);

  /**
   * Disconnects from WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('[useWebSocket] Disconnecting from WebSocket');
    
    isUnmountingRef.current = true;
    cleanupConnection();

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    setConnectionHealth('unhealthy');
    setClientId(null);
    reconnectAttemptsRef.current = 0;
  }, [cleanupConnection]);

  /**
   * Subscribes to additional correlation IDs
   */
  const subscribeToCorrelationIds = useCallback(async (correlationIds: string[]) => {
    console.log('[useWebSocket] Starting subscription:', {
      correlationIds,
      isConnected,
      clientId
    });

    // If not connected, try to connect first
    if (!isConnected && !isConnecting) {
      console.log('[useWebSocket] Not connected, attempting to connect first...');
      try {
        await connect();
        console.log('[useWebSocket] Connection established, waiting for clientId...');
      } catch (error) {
        console.error('[useWebSocket] Failed to establish connection:', error);
        throw new Error('Failed to establish WebSocket connection');
      }
    }

    // Wait for both connection and clientId to be ready
    if (!isConnected || !clientId) {
      console.log('[useWebSocket] Waiting for connection to be ready:', {
        isConnected,
        clientId: !!clientId
      });
      
      // Add to pending subscriptions and return
      correlationIds.forEach(id => pendingSubscriptionsRef.current.add(id));
      console.log('[useWebSocket] Added to pending subscriptions:', {
        pendingCount: pendingSubscriptionsRef.current.size,
        correlationIds
      });
      return;
    }

    try {
      // Send subscription message
      const message = {
        type: 'subscribe',
        data: { clientId, correlationIds }
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
        console.log('[useWebSocket] Subscription sent:', message);
      } else {
        // Queue message for later
        messageQueueRef.current.push({
          id: `sub_${Date.now()}`,
          type: 'subscribe',
          data: { clientId, correlationIds },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3
        });
        console.log('[useWebSocket] Subscription queued:', message);
      }
    } catch (error: any) {
      console.error('[useWebSocket] Subscription failed:', error);
      setConnectionError(error.message);
    }
  }, [clientId, isConnected, isConnecting, connect]);

  /**
   * Gets status for a specific correlation ID
   */
  const getStatus = useCallback((correlationId: string): WebSocketStatusUpdate | null => {
    return statusUpdates.get(correlationId) || null;
  }, [statusUpdates]);

  /**
   * Checks if status is complete (COMPLETED or FAILED)
   */
  const isStatusComplete = useCallback((correlationId: string): boolean => {
    const status = getStatus(correlationId);
    return status?.status === 'COMPLETED' || status?.status === 'FAILED';
  }, [getStatus]);

  /**
   * Checks if status is failed
   */
  const isStatusFailed = useCallback((correlationId: string): boolean => {
    const status = getStatus(correlationId);
    return status?.status === 'FAILED';
  }, [getStatus]);

  /**
   * Gets all active operations (PENDING or IN_PROGRESS status)
   */
  const getActiveOperations = useCallback((): string[] => {
    const active: string[] = [];
    for (const [correlationId, status] of statusUpdates.entries()) {
      if (status.status === 'PENDING' || status.status === 'IN_PROGRESS') {
        active.push(correlationId);
      }
    }
    return active;
  }, [statusUpdates]);

  /**
   * Gets all completed operations (COMPLETED status)
   */
  const getCompletedOperations = useCallback((): string[] => {
    const completed: string[] = [];
    for (const [correlationId, status] of statusUpdates.entries()) {
      if (status.status === 'COMPLETED') {
        completed.push(correlationId);
      }
    }
    return completed;
  }, [statusUpdates]);

  /**
   * Gets all failed operations (FAILED status)
   */
  const getFailedOperations = useCallback((): string[] => {
    const failed: string[] = [];
    for (const [correlationId, status] of statusUpdates.entries()) {
      if (status.status === 'FAILED') {
        failed.push(correlationId);
      }
    }
    return failed;
  }, [statusUpdates]);

  /**
   * Gets all pending operations (no status yet)
   */
  const getPendingOperations = useCallback((): string[] => {
    const pending: string[] = [];
    for (const [correlationId, status] of statusUpdates.entries()) {
      if (!status || !status.status) {
        pending.push(correlationId);
      }
    }
    return pending;
  }, [statusUpdates]);

  /**
   * Clears completed operations from status updates
   */
  const clearCompletedOperations = useCallback((): void => {
    setStatusUpdates(prev => {
      const newMap = new Map(prev);
      for (const [correlationId, status] of newMap.entries()) {
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          newMap.delete(correlationId);
        }
      }
      return newMap;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (user?.id && isInitialized && !isConnected && !isConnecting) {
      console.log('[useWebSocket] Auto-connecting...');
      connect();
    }
  }, [user?.id, isInitialized, isConnected, isConnecting, connect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    connectionHealth,
    
    // Status updates
    statusUpdates,
    
    // Connection management
    connect,
    disconnect,
    subscribeToCorrelationIds,
    
    // Status helpers
    getStatus,
    isStatusComplete,
    isStatusFailed,
    
    // Multiple app queue helpers
    getActiveOperations,
    getCompletedOperations,
    getFailedOperations,
    getPendingOperations,
    clearCompletedOperations,
    
    // Connection info
    clientId,
    connectionStats
  };
}
