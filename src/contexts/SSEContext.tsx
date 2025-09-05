import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface SSEContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
  
  // Status updates
  statusUpdates: Map<string, any>;
  
  // Connection management
  connect: (correlationIds?: string[]) => Promise<void>;
  disconnect: () => void;
  subscribeToCorrelationIds: (correlationIds: string[]) => Promise<void>;
  
  // Status helpers
  getStatus: (correlationId: string) => any;
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

const SSEContext = createContext<SSEContextType | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
}

/**
 * SSE Context Provider for global SSE state management
 * Uses WebSocket for React Native compatibility
 */
export function SSEProvider({ children }: SSEProviderProps) {
  const sseState = useWebSocket();

  return (
    <SSEContext.Provider value={sseState}>
      {children}
    </SSEContext.Provider>
  );
}

/**
 * Hook to use SSE context
 */
export function useSSEContext(): SSEContextType {
  const context = useContext(SSEContext);
  if (context === undefined) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  return context;
}
