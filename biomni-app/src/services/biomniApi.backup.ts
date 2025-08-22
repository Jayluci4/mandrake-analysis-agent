/**
 * Biomni API Service
 * Handles all communication with the Biomni backend
 */

import axios from 'axios';
import type { Message } from '../types/components';
import type { StreamEvent } from '../types/streaming';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';  // Use relative URLs with proxy
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
    const url = `/api/chat/stream?` + new URLSearchParams({
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
 * Streaming Event Handler
 */
export class StreamingEventHandler {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, (event: StreamEvent) => void> = new Map();

  constructor(private url: string) {}

  // Connect to SSE stream
  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.eventSource = new EventSource(this.url);

    // Handle different event types
    this.eventSource.addEventListener('planning', (e) => {
      this.handleEvent('planning', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('tool_call', (e) => {
      this.handleEvent('tool_call', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('tool_output', (e) => {
      this.handleEvent('tool_output', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('code_execution', (e) => {
      this.handleEvent('code_execution', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('visualization', (e) => {
      this.handleEvent('visualization', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('final_result', (e) => {
      this.handleEvent('final_result', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('error', (e: any) => {
      try {
        if (e.data) {
          this.handleEvent('error', JSON.parse(e.data));
        }
      } catch (err) {
        console.error('Error parsing error event:', err);
      }
    });

    // Handle connection events
    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      console.log('EventSource readyState:', this.eventSource?.readyState);
      
      // Only handle error if connection is actually broken
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log('EventSource connection closed');
        this.handleEvent('error', {
          event_type: 'error',
          error: 'Connection closed by server',
          recoverable: true,
          timestamp: new Date().toISOString(),
        });
      } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
        console.log('EventSource attempting to reconnect...');
      }
    };
  }

  // Register event handler
  on(eventType: string, handler: (event: StreamEvent) => void): void {
    this.handlers.set(eventType, handler);
  }

  // Handle incoming event
  private handleEvent(eventType: string, data: any): void {
    const handler = this.handlers.get(eventType);
    if (handler) {
      handler(data);
    }

    // Also call generic handler
    const allHandler = this.handlers.get('*');
    if (allHandler) {
      allHandler({ ...data, event_type: eventType });
    }
  }

  // Disconnect from stream
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Mock API for development
 */
export const mockApi = {
  // Simulate streaming response
  simulateStream: (
    message: string,
    onEvent: (event: StreamEvent) => void,
    onComplete: (response: string) => void
  ): void => {
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

    // Emit events with delays
    events.forEach((event, index) => {
      setTimeout(() => {
        onEvent(event);
        
        // Call complete after last event
        if (index === events.length - 1) {
          setTimeout(() => {
            onComplete(`Analysis complete for: "${message}"`);
          }, 500);
        }
      }, (index + 1) * 1000);
    });
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