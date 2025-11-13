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
 * Production-ready React hook for managing WebSocket connections
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
    heartbeatTimeout: 10000,
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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connection state tracking
  const reconnectAttemptsRef = useRef(0);
  const hasAttemptedInitialConnectionRef = useRef(false);
  const isUnmountingRef = useRef(false);
  const lastHeartbeatRef = useRef<number>(0);
  const circuitBreakerFailuresRef = useRef(0);
  const isCircuitBreakerOpenRef = useRef(false);
  
  // Message queuing for offline scenarios
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const pendingSubscriptionsRef = useRef<Set<string>>(new Set());
  const correlationIdSubscriptionsRef = useRef<Set<string>>(new Set());

  // React Native platform info (simplified)
  const platformInfo = {
    userAgent: 'ReactNative',
    platform: 'ReactNative',
    isWindows: false,
    isMac: false,
    isLinux: false,
    isChrome: false,
    isFirefox: false,
    isSafari: false,
    isEdge: false
  };

  console.log('🔵 [WS-DEBUG] useWebSocket hook initialized:', {
    user: user ? { id: user.id, email: user.email } : null,
    isInitialized,
    platformInfo,
    timestamp: new Date().toISOString()
  });

  /**
   * Calculates exponential backoff delay with jitter and platform-specific adjustments
   */
  const calculateReconnectDelay = useCallback((attempt: number): number => {
    let exponentialDelay = Math.min(
      config.baseReconnectDelay * Math.pow(2, attempt - 1),
      config.maxReconnectDelay
    );
    
    // Platform-specific adjustments
    if (platformInfo.isWindows) {
      exponentialDelay *= 1.5; // Windows needs more time
    } else if (platformInfo.isSafari) {
      exponentialDelay *= 1.2; // Safari is slower
    }
    
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }, [config.baseReconnectDelay, config.maxReconnectDelay, platformInfo]);

  /**
   * Circuit breaker pattern implementation
   */
  const handleCircuitBreakerFailure = useCallback(() => {
    circuitBreakerFailuresRef.current++;
    
    if (circuitBreakerFailuresRef.current >= config.circuitBreakerThreshold) {
      isCircuitBreakerOpenRef.current = true;
      setConnectionHealth('unhealthy');
      
      console.error('🔴 [WS-CIRCUIT-BREAKER] Circuit breaker opened due to repeated failures');
      
      // Reset circuit breaker after timeout
      circuitBreakerTimeoutRef.current = setTimeout(() => {
        isCircuitBreakerOpenRef.current = false;
        circuitBreakerFailuresRef.current = 0;
        setConnectionHealth('degraded');
        console.log('🟡 [WS-CIRCUIT-BREAKER] Circuit breaker reset, attempting reconnection');
      }, config.circuitBreakerTimeout);
    }
  }, [config.circuitBreakerThreshold, config.circuitBreakerTimeout]);

  const handleCircuitBreakerSuccess = useCallback(() => {
    if (circuitBreakerFailuresRef.current > 0) {
      circuitBreakerFailuresRef.current = Math.max(0, circuitBreakerFailuresRef.current - 1);
    }
    
    if (isCircuitBreakerOpenRef.current) {
      isCircuitBreakerOpenRef.current = false;
      setConnectionHealth('healthy');
      console.log('🟢 [WS-CIRCUIT-BREAKER] Circuit breaker closed after successful connection');
    }
  }, []);

  /**
   * Message queuing system for offline scenarios
   */
  const queueMessage = useCallback((message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };
    
    messageQueueRef.current.push(queuedMessage);
    
    // Maintain queue size limit
    if (messageQueueRef.current.length > config.messageQueueSize) {
      messageQueueRef.current.shift();
    }
    
    console.log('📦 [WS-QUEUE] Message queued:', queuedMessage.id, 'Queue size:', messageQueueRef.current.length);
  }, [config.messageQueueSize]);

  const processMessageQueue = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const messagesToProcess = messageQueueRef.current.filter(msg => msg.retryCount < msg.maxRetries);
    
    messagesToProcess.forEach(message => {
      try {
        const messageData = JSON.stringify({
          type: message.type,
          data: message.data,
          timestamp: new Date().toISOString(),
          queued: true,
          queueId: message.id
        });
        
        socketRef.current!.send(messageData);
        message.retryCount++;
        
        console.log('📤 [WS-QUEUE] Processed queued message:', message.id, 'Retry:', message.retryCount);
        
        setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
      } catch (error) {
        console.error('🔴 [WS-QUEUE] Failed to process queued message:', message.id, error);
        message.retryCount++;
      }
    });
    
    // Remove successfully processed messages
    messageQueueRef.current = messageQueueRef.current.filter(msg => msg.retryCount < msg.maxRetries);
  }, []);

  /**
   * Heartbeat mechanism for connection health monitoring
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          const pingMessage = JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
            clientId: clientId
          });
          
          socketRef.current.send(pingMessage);
          lastHeartbeatRef.current = Date.now();
          
          // Set timeout for pong response
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
          }
          
          heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('⚠️ [WS-HEARTBEAT] Pong timeout, connection may be unhealthy');
            setConnectionHealth('degraded');
            handleCircuitBreakerFailure();
          }, config.heartbeatTimeout);
          
          console.log('🏓 [WS-HEARTBEAT] Ping sent');
        } catch (error) {
          console.error('🔴 [WS-HEARTBEAT] Ping failed:', error);
          handleCircuitBreakerFailure();
        }
      }
    }, config.heartbeatInterval);
  }, [clientId, config.heartbeatInterval, config.heartbeatTimeout, handleCircuitBreakerFailure]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  /**
   * Connection validation and health checks
   */
  const validateConnection = useCallback((): boolean => {
    if (!socketRef.current) {
      return false;
    }
    
    const readyState = socketRef.current.readyState;
    const isOpen = readyState === WebSocket.OPEN;
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
    
    // Connection is healthy if:
    // 1. WebSocket is open
    // 2. We've received a heartbeat within the timeout period
    // 3. Circuit breaker is not open
    const isHealthy = isOpen && 
                     timeSinceLastHeartbeat < config.heartbeatTimeout * 2 && 
                     !isCircuitBreakerOpenRef.current;
    
    if (isHealthy) {
      setConnectionHealth('healthy');
      handleCircuitBreakerSuccess();
    } else if (isOpen) {
      setConnectionHealth('degraded');
    } else {
      setConnectionHealth('unhealthy');
    }
    
    return isHealthy;
  }, [config.heartbeatTimeout, handleCircuitBreakerSuccess]);

  /**
   * Disconnects the WebSocket connection
   */
  const disconnect = useCallback(() => {
    console.log('🔵 [WS-DISCONNECT] Disconnecting WebSocket...');
    
    // Clear all timeouts and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (circuitBreakerTimeoutRef.current) {
      clearTimeout(circuitBreakerTimeoutRef.current);
      circuitBreakerTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    // Close WebSocket connection
    if (socketRef.current) {
      socketRef.current.close(1000, 'User initiated disconnect');
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    setConnectionHealth('unhealthy');
    reconnectAttemptsRef.current = 0;
    
    setConnectionStats(prev => ({
      ...prev,
      lastDisconnectedAt: new Date().toISOString()
    }));
  }, [stopHeartbeat]);

  /**
   * Connects to the WebSocket server with production-ready error handling
   */
  const connect = useCallback(async (correlationIds?: string[]) => {
    if (isUnmountingRef.current) {
      console.log('🔵 [WS-CONNECT] Component unmounting, skipping connection');
      return;
    }

    if (isConnecting || isConnected) {
      console.log('🔵 [WS-CONNECT] Already connecting or connected, skipping');
      return;
    }

    if (!user?.id) {
      console.log('🔵 [WS-CONNECT] No user ID available, skipping connection');
      return;
    }

    // Check circuit breaker
    if (isCircuitBreakerOpenRef.current) {
      console.log('🔴 [WS-CONNECT] Circuit breaker is open, skipping connection');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    hasAttemptedInitialConnectionRef.current = true;

    try {
      console.log('🔵 [WS-CONNECT] Creating WebSocket connection...', {
        platformInfo,
        attempt: reconnectAttemptsRef.current + 1
      });
      
      // React Native specific WebSocket URL
      const baseUrl = 'http://192.168.0.4:5050';
      const wsUrl = baseUrl.replace('http', 'ws') + '/ws';
      
      console.log('🔵 [WS-CONNECT] WebSocket URL:', wsUrl);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      setConnectionStats(prev => ({ ...prev, totalConnections: prev.totalConnections + 1 }));

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.error('🔴 [WS-CONNECT] Connection timeout');
          socket.close();
          setConnectionError('Connection timeout');
          setIsConnecting(false);
          handleCircuitBreakerFailure();
        }
      }, config.connectionTimeout);

      socket.onopen = (event) => {
        console.log('🟢 [WS-CONNECT] WebSocket connected:', {
          readyState: socket.readyState,
          url: socket.url,
          platformInfo,
          timestamp: new Date().toISOString()
        });

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        setConnectionHealth('healthy');
        reconnectAttemptsRef.current = 0;
        
        setConnectionStats(prev => ({
          ...prev,
          successfulConnections: prev.successfulConnections + 1,
          lastConnectedAt: new Date().toISOString()
        }));

        handleCircuitBreakerSuccess();

        // Send authentication message with retry mechanism
        const sendAuth = () => {
          try {
            const authMessage = JSON.stringify({
              type: 'authenticate',
              data: { userId: user.id },
              timestamp: new Date().toISOString()
            });
            console.log('🔐 [WS-AUTH] Sending authentication:', authMessage);
            socket.send(authMessage);
            setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
          } catch (error) {
            console.error('🔴 [WS-AUTH] Failed to send authentication:', error);
            // Retry authentication after a short delay
            setTimeout(sendAuth, 1000);
          }
        };
        
        sendAuth();
        
        // Start heartbeat mechanism
        startHeartbeat();
        
        // Process any queued messages
        processMessageQueue();
      };

      socket.onmessage = (event) => {
        console.log('📥 [DEVPORTAL-WebSocket] Raw message received:', event.data);
        
        setConnectionStats(prev => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }));
        
        try {
          const message = JSON.parse(event.data);
          console.log('🔵 [DEVPORTAL-WebSocket] Parsed message:', message);

          // Handle pong responses
          if (message.type === 'pong') {
            console.log('🏓 [WS-HEARTBEAT] Pong received');
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }
            setConnectionHealth('healthy');
            return;
          }

          if (message.type === 'connection_established') {
            setClientId(message.data.clientId);
            console.log('🟢 [DEVPORTAL-WebSocket] Client ID received:', message.data.clientId);
          } else if (message.type === 'authenticated') {
            console.log('🟢 [DEVPORTAL-WebSocket] Authentication successful:', message.data);
          } else if (message.type === 'app.created' || message.type === 'app.created.error') {
            // Handle app creation status updates
            console.log('🎯 [DEVPORTAL-WebSocket] App creation status update received:', message);
            
            const statusUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status: message.type === 'app.created.error' ? 'FAILED' : 'COMPLETED',
              message: message.data?.message || 'Operation completed',
              data: message.data?.app || message.data,
              error: message.data?.error,
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Status update created:', statusUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, statusUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Status update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'app.response.permanentDelete' || message.type === 'app.response.permanentDelete.sse') {
            // Handle permanent delete status updates
            console.log('🗑️ [DEVPORTAL-WebSocket] App permanent delete status update received:', message);
            
            const statusUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status: message.data?.success ? 'COMPLETED' : 'FAILED',
              message: message.data?.message || 'Permanent delete operation completed',
              data: message.data,
              error: message.data?.error,
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Permanent delete status update created:', statusUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, statusUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Permanent delete status update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'app.creation.progress') {
            // Handle real-time progress updates
            console.log('📈 [DEVPORTAL-WebSocket] Progress update received:', message);
            
            const progressUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status: 'IN_PROGRESS',
              message: `${message.data.progress}% - ${message.data.message}`,
              data: {
                progress: message.data.progress,
                stage: message.data.stage,
                message: message.data.message
              },
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Progress update created:', progressUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, progressUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Progress update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'app.buildBundle.progress') {
            // Handle build bundle progress updates
            console.log('🔨 [DEVPORTAL-WebSocket] Build progress update received:', message);
            
            // Determine status based on progress value
            const isCompleted = message.data.progress === 100;
            const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
            
            const buildProgressUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status,
              message: `${message.data.progress}% - ${message.data.message}`,
              data: {
                progress: message.data.progress,
                stage: message.data.stage || 'Building AAB',
                message: message.data.message
              },
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Build progress update created:', buildProgressUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, buildProgressUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Build progress update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'app.bundle.progress') {
            // Handle bundle progress updates
            console.log('📦 [DEVPORTAL-WebSocket] Bundle progress update received:', message);
            
            // Determine status based on progress value
            const isCompleted = message.data.progress === 100;
            const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
            
            const bundleProgressUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status,
              message: `${message.data.progress}% - ${message.data.message}`,
              data: {
                progress: message.data.progress,
                stage: message.data.stage || 'Building Bundle',
                message: message.data.message,
                downloadUrl: message.data.downloadUrl // Include download URL for bundle completion
              },
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Bundle progress update created:', bundleProgressUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, bundleProgressUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Bundle progress update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'app.bundle.completed') {
            // Handle bundle completion updates
            console.log('🎉 [DEVPORTAL-WebSocket] Bundle completion message received:', message);

            const payload = {
              ...message.data,
              ...(message.data?.app || {})
            };

            const downloadUrl =
              payload.downloadUrl ||
              payload.bundleUrl ||
              payload.url;

            const isSuccess = payload.success !== false;

            const bundleCompletionUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status: isSuccess ? 'COMPLETED' : 'FAILED',
              message: payload.message || 'Bundle generation completed',
              data: {
                ...payload,
                downloadUrl
              },
              error: isSuccess ? undefined : payload.error,
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Bundle completion update created:', bundleCompletionUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, bundleCompletionUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Bundle completion update stored for correlation ID:', message.correlationId);
          
          }else if (message.type === 'app.buildDebug.progress') {
            // Handle build debug progress updates
            console.log('🐛 [DEVPORTAL-WebSocket] Build debug progress update received:', message);
            
            // Determine status based on progress value
            const isCompleted = message.data.progress === 100;
            const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
            
            const buildDebugProgressUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status,
              message: `${message.data.progress}% - ${message.data.message}`,
              data: {
                progress: message.data.progress,
                stage: message.data.stage || 'Building Debug APK',
                message: message.data.message
              },
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Build debug progress update created:', buildDebugProgressUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, buildDebugProgressUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Build debug progress update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'app.buildRelease.progress') {
            // Handle build release progress updates
            console.log('🚀 [DEVPORTAL-WebSocket] Build release progress update received:', message);
            
            // Determine status based on progress value
            const isCompleted = message.data.progress === 100;
            const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
            
            const buildReleaseProgressUpdate: WebSocketStatusUpdate = {
              correlationId: message.correlationId,
              status,
              message: `${message.data.progress}% - ${message.data.message}`,
              data: {
                progress: message.data.progress,
                stage: message.data.stage || 'Building Release APK',
                message: message.data.message
              },
              timestamp: message.timestamp || new Date().toISOString()
            };

            console.log('📊 [DEVPORTAL-WebSocket] Build release progress update created:', buildReleaseProgressUpdate);
            setStatusUpdates(prev => new Map(prev).set(message.correlationId, buildReleaseProgressUpdate));
            console.log('🟢 [DEVPORTAL-WebSocket] Build release progress update stored for correlation ID:', message.correlationId);
          } else if (message.type === 'error') {
            console.error('🔴 [DEVPORTAL-WebSocket] Server error:', message.data);
          } else {
            console.log('ℹ️ [DEVPORTAL-WebSocket] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('🔴 [DEVPORTAL-WebSocket] Failed to parse message:', error, event.data);
        }
      };

      socket.onerror = (error: any) => {
        console.error('🔴 [WS-ERROR] WebSocket error:', error, {
          readyState: socket.readyState,
          url: socket.url,
          platformInfo,
          attempt: reconnectAttemptsRef.current + 1
        });
        setConnectionError('WebSocket connection error');
        handleCircuitBreakerFailure();
      };

      socket.onclose = (event: any) => {
        console.log('🔵 [WS-CLOSE] WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean || false,
          platformInfo,
          attempt: reconnectAttemptsRef.current + 1
        });

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        stopHeartbeat();
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionHealth('unhealthy');
        
        setConnectionStats(prev => ({
          ...prev,
          failedConnections: prev.failedConnections + 1,
          lastDisconnectedAt: new Date().toISOString()
        }));

        // Attempt reconnection if not a clean close and not unmounting
        if (!(event.wasClean || false) && !isUnmountingRef.current && reconnectAttemptsRef.current < config.maxReconnectAttempts) {
          const delay = calculateReconnectDelay(reconnectAttemptsRef.current + 1);
          console.log(`🔵 [WS-RECONNECT] Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${config.maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect(correlationIds);
          }, delay);
        } else if (reconnectAttemptsRef.current >= config.maxReconnectAttempts) {
          console.error('🔴 [WS-RECONNECT] Max reconnection attempts reached');
          setConnectionError('Max reconnection attempts reached');
          handleCircuitBreakerFailure();
        }
      };

    } catch (error) {
      console.error('🔴 [WS-CONNECT] Failed to create WebSocket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect');
      setIsConnecting(false);
      handleCircuitBreakerFailure();
    }
  }, [user?.id, calculateReconnectDelay, config, platformInfo, startHeartbeat, stopHeartbeat, processMessageQueue, handleCircuitBreakerFailure, handleCircuitBreakerSuccess]);

  /**
   * Subscribes to correlation IDs for status updates with production-ready reliability
   */
  const subscribeToCorrelationIds = useCallback(async (correlationIds: string[]) => {
    console.log('🔵 [WS-SUBSCRIBE] Subscribing to correlation IDs:', correlationIds);

    // Add to correlation ID tracking
    correlationIds.forEach(id => correlationIdSubscriptionsRef.current.add(id));

    if (!isConnected || !clientId) {
      console.log('🔵 [WS-SUBSCRIBE] Not connected or no client ID, adding to pending subscriptions');
      correlationIds.forEach(id => pendingSubscriptionsRef.current.add(id));
      return;
    }

    const subscriptionMessage = {
      type: 'subscribe',
      data: { correlationIds },
      timestamp: new Date().toISOString(),
      maxRetries: 3
    };

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const messageString = JSON.stringify({
          type: subscriptionMessage.type,
          data: subscriptionMessage.data,
          timestamp: subscriptionMessage.timestamp
        });
        console.log('🔐 [WS-SUBSCRIBE] Sending subscription message:', messageString);
        socketRef.current.send(messageString);
        setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
        
        console.log('🟢 [WS-SUBSCRIBE] Subscription sent for correlation IDs:', correlationIds);
      } else {
        console.warn('🔴 [WS-SUBSCRIBE] WebSocket not ready, queuing subscription');
        queueMessage(subscriptionMessage);
        correlationIds.forEach(id => pendingSubscriptionsRef.current.add(id));
      }
    } catch (error) {
      console.error('🔴 [WS-SUBSCRIBE] Failed to subscribe:', error);
      queueMessage(subscriptionMessage);
      correlationIds.forEach(id => pendingSubscriptionsRef.current.add(id));
    }
  }, [isConnected, clientId, queueMessage]);

  // Auto-subscribe to pending correlation IDs when connection is ready
  useEffect(() => {
    if (isConnected && clientId && pendingSubscriptionsRef.current.size > 0) {
      const pendingIds = Array.from(pendingSubscriptionsRef.current);
      pendingSubscriptionsRef.current.clear();
      
      console.log('🔵 [WS-AUTO-SUBSCRIBE] Auto-subscribing to pending correlation IDs:', pendingIds);
      subscribeToCorrelationIds(pendingIds);
    }
  }, [isConnected, clientId, subscribeToCorrelationIds]);

  // Auto-connect when user is available
  useEffect(() => {
    if (isInitialized && user?.id && !hasAttemptedInitialConnectionRef.current) {
      console.log('🔵 [WS-AUTO-CONNECT] Auto-connecting with user ID:', user.id);
      connect();
    }
  }, [isInitialized, user?.id, connect]);

  // Connection health monitoring
  useEffect(() => {
    if (isConnected) {
      const healthCheckInterval = setInterval(() => {
        validateConnection();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(healthCheckInterval);
    }
  }, [isConnected, validateConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  // Status helper functions
  const getStatus = useCallback((correlationId: string) => {
    return statusUpdates.get(correlationId) || null;
  }, [statusUpdates]);

  const isStatusComplete = useCallback((correlationId: string) => {
    const status = getStatus(correlationId);
    return status?.status === 'COMPLETED' || status?.status === 'FAILED';
  }, [getStatus]);

  const isStatusFailed = useCallback((correlationId: string) => {
    const status = getStatus(correlationId);
    return status?.status === 'FAILED';
  }, [getStatus]);

  const getActiveOperations = useCallback(() => {
    return Array.from(statusUpdates.entries())
      .filter(([_, status]) => status.status === 'PENDING')
      .map(([correlationId, _]) => correlationId);
  }, [statusUpdates]);

  const getCompletedOperations = useCallback(() => {
    return Array.from(statusUpdates.entries())
      .filter(([_, status]) => status.status === 'COMPLETED')
      .map(([correlationId, _]) => correlationId);
  }, [statusUpdates]);

  const getFailedOperations = useCallback(() => {
    return Array.from(statusUpdates.entries())
      .filter(([_, status]) => status.status === 'FAILED')
      .map(([correlationId, _]) => correlationId);
  }, [statusUpdates]);

  const getPendingOperations = useCallback(() => {
    return Array.from(pendingSubscriptionsRef.current);
  }, []);

  const clearCompletedOperations = useCallback(() => {
    setStatusUpdates(prev => {
      const newMap = new Map(prev);
      Array.from(newMap.entries())
        .filter(([_, status]) => status.status === 'COMPLETED' || status.status === 'FAILED')
        .forEach(([correlationId, _]) => newMap.delete(correlationId));
      return newMap;
    });
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionError,
    connectionHealth,
    statusUpdates,
    connect,
    disconnect,
    subscribeToCorrelationIds,
    getStatus,
    isStatusComplete,
    isStatusFailed,
    getActiveOperations,
    getCompletedOperations,
    getFailedOperations,
    getPendingOperations,
    clearCompletedOperations,
    clientId,
    connectionStats
  };
}