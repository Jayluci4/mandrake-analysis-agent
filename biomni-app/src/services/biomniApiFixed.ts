/**
 * Biomni API Service - FIXED VERSION
 * Handles all API interactions with the Biomni backend
 */

import axios from 'axios';

// Use relative URLs for proxy compatibility
const API_BASE_URL = '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Configure axios defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add auth header if API key exists
if (API_KEY) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${API_KEY}`;
}

// Request/Response interceptors for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);

// Types
export interface StreamEvent {
  event_type: string;
  content?: string;
  tool_name?: string;
  code?: string;
  output?: string;
  error?: string;
  data?: any;
  metadata?: any;
  timestamp: string;
}

export interface Session {
  id: string;
  name: string;
  created_at: string;
  last_activity: string;
  messages: Message[];
  files: FileInfo[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: string[];
  metadata?: any;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  content_type: string;
  uploaded_at: string;
  session_id?: string;
}

export interface Tool {
  name: string;
  description: string;
  category: string;
  parameters?: any;
}

// Streaming Event Handler with proper connection management
export class StreamingEventHandler {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, ((event: StreamEvent) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private isClosed = false;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(private url: string) {}

  connect() {
    // Prevent multiple connections
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      console.log('Already connected or connecting');
      return;
    }

    // Prevent reconnection if manually closed
    if (this.isClosed) {
      console.log('Connection was manually closed, not reconnecting');
      return;
    }

    this.isConnecting = true;
    console.log('Connecting to SSE stream:', this.url);

    try {
      // Close existing connection if any
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      this.eventSource = new EventSource(this.url);
      
      // Set a timeout for initial connection
      this.connectionTimeout = setTimeout(() => {
        if (this.eventSource?.readyState !== EventSource.OPEN) {
          console.error('Connection timeout');
          this.handleError(new Error('Connection timeout'));
        }
      }, 10000);

      this.eventSource.onopen = () => {
        console.log('SSE Connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          console.log('Raw SSE message:', event);
          const data = JSON.parse(event.data);
          this.handleEvent(data.event_type || 'message', data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error, event.data);
        }
      };

      // Handle specific event types
      const eventTypes = ['connected', 'planning', 'tool_call', 'tool_output', 'code_execution', 'visualization', 'final_result', 'error'];
      
      eventTypes.forEach(eventType => {
        this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
          try {
            console.log(`SSE Event [${eventType}]:`, event.data);
            const data = JSON.parse(event.data);
            this.handleEvent(eventType, data);
          } catch (error) {
            console.error(`Failed to parse ${eventType} event:`, error);
          }
        });
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        this.isConnecting = false;
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Only attempt reconnect if not manually closed and within retry limit
        if (!this.isClosed && this.eventSource?.readyState === EventSource.CLOSED) {
          this.handleError(error);
        }
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.isConnecting = false;
      this.handleError(error);
    }
  }

  private handleError(error: any) {
    // Emit error event
    this.handleEvent('error', {
      event_type: 'error',
      error: error.message || 'Connection error',
      timestamp: new Date().toISOString(),
    });

    // Attempt reconnection with exponential backoff
    if (!this.isClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isClosed) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleEvent('error', {
        event_type: 'error',
        error: 'Connection failed after multiple attempts',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleEvent(eventType: string, data: StreamEvent) {
    // Emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*') || [];
    wildcardListeners.forEach(listener => listener(data));

    // Emit to specific event type listeners
    const typeListeners = this.listeners.get(eventType) || [];
    typeListeners.forEach(listener => listener(data));
  }

  on(eventType: string, callback: (event: StreamEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  disconnect() {
    console.log('Disconnecting SSE stream');
    this.isClosed = true;
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.listeners.clear();
    this.isConnecting = false;
  }
}

// API Methods
const biomniApi = {
  // Health check
  health: {
    check: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
  },

  // Session management
  session: {
    create: async (name?: string) => {
      const response = await apiClient.post<Session>('/api/sessions', { name });
      return response.data;
    },
    
    list: async () => {
      const response = await apiClient.get<Session[]>('/api/sessions');
      return response.data;
    },
    
    get: async (sessionId: string) => {
      const response = await apiClient.get<Session>(`/api/sessions/${sessionId}`);
      return response.data;
    },
    
    update: async (sessionId: string, data: Partial<Session>) => {
      const response = await apiClient.patch<Session>(`/api/sessions/${sessionId}`, data);
      return response.data;
    },
    
    delete: async (sessionId: string) => {
      const response = await apiClient.delete(`/api/sessions/${sessionId}`);
      return response.data;
    },
    
    getMessages: async (sessionId: string) => {
      const response = await apiClient.get<Message[]>(`/api/sessions/${sessionId}/messages`);
      return response.data;
    },
  },

  // Chat operations
  chat: {
    sendMessage: async (message: string, sessionId: string = 'default', fileIds?: string[]) => {
      // Build SSE URL with query parameters
      const params = new URLSearchParams({
        message,
        session_id: sessionId,
      });
      
      if (fileIds && fileIds.length > 0) {
        params.append('file_ids', fileIds.join(','));
      }
      
      const url = `/api/chat/stream?${params.toString()}`;
      return { url };
    },
  },

  // File operations
  file: {
    upload: async (file: File, sessionId?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (sessionId) {
        formData.append('session_id', sessionId);
      }
      
      const response = await apiClient.post<FileInfo>('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    
    getMetadata: async (fileId: string) => {
      const response = await apiClient.get<FileInfo>(`/api/files/${fileId}`);
      return response.data;
    },
    
    delete: async (fileId: string) => {
      const response = await apiClient.delete(`/api/files/${fileId}`);
      return response.data;
    },
  },

  // Tool operations
  tool: {
    list: async () => {
      const response = await apiClient.get<Tool[]>('/api/tools');
      return response.data;
    },
    
    execute: async (toolName: string, parameters: any) => {
      const response = await apiClient.post(`/api/tools/${toolName}/execute`, { parameters });
      return response.data;
    },
  },

  // Mock API for development
  mock: {
    simulateStream: (message: string, onEvent: (event: StreamEvent) => void, onComplete: (response: string) => void) => {
      const events: StreamEvent[] = [
        {
          event_type: 'planning',
          content: `Analyzing: "${message}"`,
          timestamp: new Date().toISOString(),
        },
        {
          event_type: 'tool_call',
          tool_name: 'mock_tool',
          content: 'Executing mock analysis',
          timestamp: new Date().toISOString(),
        },
        {
          event_type: 'tool_output',
          content: 'Mock analysis complete',
          timestamp: new Date().toISOString(),
        },
      ];

      let index = 0;
      const interval = setInterval(() => {
        if (index < events.length) {
          onEvent(events[index]);
          index++;
        } else {
          clearInterval(interval);
          onComplete(`Mock response for: "${message}"`);
        }
      }, 500);
    },
  },
};

export default biomniApi;