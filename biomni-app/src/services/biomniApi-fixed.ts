/**
 * Fixed Biomni API Service
 * Handles all communication with the Biomni backend
 */

import axios from 'axios';
import type { Message } from '../types/components';
import type { StreamEvent } from '../types/streaming';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY }),
  },
  timeout: 30000,
});

// Request interceptor for auth
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('biomni_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('biomni_auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Chat API
 */
export const chatApi = {
  // Send message and get streaming response (returns URL for SSE)
  sendMessage: async (
    message: string,
    sessionId: string,
    fileIds?: string[]
  ): Promise<{ url: string }> => {
    const url = `${API_BASE_URL}/api/chat/stream?` + new URLSearchParams({
      message,
      session_id: sessionId,
      ...(fileIds?.length && { file_ids: fileIds.join(',') }),
    });
    return { url };
  },

  // Get chat history
  getHistory: async (sessionId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/api/sessions/${sessionId}/messages`);
    return response.data;
  },

  // Clear chat history
  clearHistory: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/sessions/${sessionId}/messages`);
  },
};

/**
 * Session API
 */
export const sessionApi = {
  // Create new session
  create: async (name?: string): Promise<{ id: string; name: string }> => {
    const response = await apiClient.post('/api/sessions', { name });
    return response.data;
  },

  // List all sessions
  list: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/sessions');
    return response.data;
  },

  // Get session details
  get: async (sessionId: string): Promise<any> => {
    const response = await apiClient.get(`/api/sessions/${sessionId}`);
    return response.data;
  },

  // Update session
  update: async (sessionId: string, data: any): Promise<any> => {
    const response = await apiClient.patch(`/api/sessions/${sessionId}`, data);
    return response.data;
  },

  // Delete session
  delete: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/sessions/${sessionId}`);
  },
};

/**
 * File API
 */
export const fileApi = {
  // Upload file
  upload: async (file: File, sessionId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    const response = await apiClient.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get file metadata
  getMetadata: async (fileId: string): Promise<any> => {
    const response = await apiClient.get(`/api/files/${fileId}`);
    return response.data;
  },

  // Delete file
  delete: async (fileId: string): Promise<void> => {
    await apiClient.delete(`/api/files/${fileId}`);
  },

  // List files for session
  listForSession: async (sessionId: string): Promise<any[]> => {
    const response = await apiClient.get(`/api/sessions/${sessionId}/files`);
    return response.data;
  },
};

/**
 * Tools API
 */
export const toolsApi = {
  // Get available tools
  list: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/tools');
    return response.data;
  },

  // Execute tool directly
  execute: async (toolName: string, parameters: any): Promise<any> => {
    const response = await apiClient.post(`/api/tools/${toolName}/execute`, parameters);
    return response.data;
  },

  // Get tool documentation
  getDocumentation: async (toolName: string): Promise<any> => {
    const response = await apiClient.get(`/api/tools/${toolName}/docs`);
    return response.data;
  },
};

/**
 * FIXED: Enhanced Streaming Event Handler with proper cleanup and error handling
 */
export class StreamingEventHandler {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, ((event: StreamEvent) => void)[]> = new Map();
  private url: string;
  private isConnected = false;
  private connectionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private cleanupCallbacks: (() => void)[] = [];
  
  // Track event handlers to prevent memory leaks
  private eventListenerCleanup: Map<string, AbortController> = new Map();

  constructor(url: string) {
    this.url = url;
    this.connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Connect to SSE stream with enhanced error handling
   */
  connect(): void {
    if (this.isConnected || this.eventSource) {
      console.warn('Already connected or connecting, disconnect first');
      return;
    }

    try {
      console.log(`[${this.connectionId}] Connecting to SSE stream:`, this.url);
      
      this.eventSource = new EventSource(this.url, {
        withCredentials: false
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      
    } catch (error) {
      console.error(`[${this.connectionId}] Failed to create EventSource:`, error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Enhanced event handler setup with proper cleanup
   */
  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    // Connection opened
    this.eventSource.onopen = () => {
      console.log(`[${this.connectionId}] SSE connection established`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    };

    // Connection error with proper state management
    this.eventSource.onerror = (error) => {
      console.error(`[${this.connectionId}] SSE Error:`, error);
      
      // Check the actual ready state to determine if we should reconnect
      if (this.eventSource) {
        const readyState = this.eventSource.readyState;
        
        if (readyState === EventSource.CLOSED) {
          this.isConnected = false;
          this.handleConnectionError(new Error('EventSource connection closed'));
        } else if (readyState === EventSource.CONNECTING) {
          // Still trying to connect, wait
          console.log(`[${this.connectionId}] Connection in progress...`);
        }
      }
    };

    // Setup event listeners for specific event types with AbortController
    const eventTypes = [
      'planning', 'tool_call', 'tool_output', 'code_execution',
      'visualization', 'final_result', 'error'
    ];

    eventTypes.forEach(eventType => {
      if (!this.eventSource) return;
      
      const abortController = new AbortController();
      this.eventListenerCleanup.set(eventType, abortController);

      const handler = (e: MessageEvent) => {
        try {
          this.handleEvent(eventType, JSON.parse(e.data));
        } catch (err) {
          console.error(`[${this.connectionId}] Error parsing ${eventType} event:`, err);
        }
      };

      this.eventSource.addEventListener(eventType, handler, {
        signal: abortController.signal
      });
    });
  }

  /**
   * Register event handler with proper type safety
   */
  on(eventType: string, handler: (event: StreamEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Remove event handler
   */
  off(eventType: string, handler: (event: StreamEvent) => void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming event with error protection
   */
  private handleEvent(eventType: string, data: any): void {
    try {
      // Add metadata
      const event: StreamEvent = {
        ...data,
        event_type: eventType,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      // Dispatch to specific handlers
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`[${this.connectionId}] Error in ${eventType} handler:`, error);
          }
        });
      }

      // Also dispatch to generic handlers
      const allHandlers = this.handlers.get('*');
      if (allHandlers) {
        allHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`[${this.connectionId}] Error in generic handler:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`[${this.connectionId}] Error handling event:`, error);
    }
  }

  /**
   * Enhanced connection error handling with exponential backoff
   */
  private handleConnectionError(error: Error): void {
    console.error(`[${this.connectionId}] Connection error:`, error.message);
    
    this.isConnected = false;

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    // Only attempt reconnect if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Exponential backoff, max 10s
      
      console.log(`[${this.connectionId}] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnect();
      }, delay);
    } else {
      console.error(`[${this.connectionId}] Max reconnection attempts reached`);
      this.handleEvent('error', {
        event_type: 'error',
        error: 'Connection failed after maximum retry attempts',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Reconnect with proper cleanup
   */
  private reconnect(): void {
    console.log(`[${this.connectionId}] Reconnecting...`);
    this.disconnect(false); // Don't reset reconnect attempts
    this.connect();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected && this.eventSource?.readyState !== EventSource.CONNECTING) {
        console.warn(`[${this.connectionId}] Heartbeat detected disconnection`);
        this.handleConnectionError(new Error('Heartbeat timeout'));
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Enhanced disconnect with proper cleanup
   */
  disconnect(resetReconnectAttempts = true): void {
    console.log(`[${this.connectionId}] Disconnecting...`);
    
    this.isConnected = false;
    
    if (resetReconnectAttempts) {
      this.reconnectAttempts = 0;
    }

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Abort all event listeners
    this.eventListenerCleanup.forEach(controller => {
      controller.abort();
    });
    this.eventListenerCleanup.clear();

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Clear all handlers
    this.handlers.clear();

    // Execute cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error(`[${this.connectionId}] Error in cleanup callback:`, error);
      }
    });
    this.cleanupCallbacks = [];

    console.log(`[${this.connectionId}] Disconnection complete`);
  }

  /**
   * Add cleanup callback
   */
  addCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    readyState: number | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      readyState: this.eventSource?.readyState ?? null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

/**
 * Mock API for development
 */
export const mockApi = {
  // Simulate streaming response with proper cleanup
  simulateStream: (
    message: string,
    onEvent: (event: StreamEvent) => void,
    onComplete: (response: string) => void
  ): (() => void) => {
    const events: StreamEvent[] = [
      {
        event_type: 'planning',
        content: `Analyzing: "${message}"`,
        timestamp: new Date().toISOString(),
      } as any,
      {
        event_type: 'tool_call',
        tool_name: 'biomni_search',
        content: 'Searching biomedical knowledge base...',
        parameters: { query: message },
        timestamp: new Date().toISOString(),
      } as any,
      {
        event_type: 'tool_output',
        tool_name: 'biomni_search',
        content: 'Found relevant information',
        success: true,
        execution_time: 1500,
        timestamp: new Date().toISOString(),
      } as any,
      {
        event_type: 'final_result',
        content: `Based on my analysis of "${message}", here are the key findings from the biomedical literature...`,
        timestamp: new Date().toISOString(),
      } as any,
    ];

    const timeouts: NodeJS.Timeout[] = [];
    let cancelled = false;

    // Emit events with delays
    events.forEach((event, index) => {
      const timeout = setTimeout(() => {
        if (cancelled) return;
        
        onEvent(event);
        
        // Call complete after last event
        if (index === events.length - 1) {
          const completeTimeout = setTimeout(() => {
            if (!cancelled) {
              onComplete(`Analysis complete for: "${message}"`);
            }
          }, 500);
          timeouts.push(completeTimeout);
        }
      }, (index + 1) * 1000);
      
      timeouts.push(timeout);
    });

    // Return cleanup function
    return () => {
      cancelled = true;
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  },
};

export default {
  chat: chatApi,
  session: sessionApi,
  file: fileApi,
  tools: toolsApi,
  StreamingEventHandler,
  mock: mockApi,
};