/**
 * Streaming Query Hook
 * Integrates EventSource streaming with React state and Zustand stores
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { EventSourceManager } from '../services/streaming/EventSourceManager';
import { apiClient } from '../services/api/client';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import { useNotificationActions } from '../stores/uiStore';
import type { StreamEvent, StreamQueryConfig } from '../types/streaming';
import type { Message } from '../types/components';

interface UseStreamingQueryOptions {
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface UseStreamingQueryReturn {
  startStream: (config: StreamQueryConfig) => Promise<void>;
  stopStream: () => void;
  isStreaming: boolean;
  error: Error | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  events: StreamEvent[];
}

export function useStreamingQuery(options: UseStreamingQueryOptions = {}): UseStreamingQueryReturn {
  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected');
  const [events, setEvents] = useState<StreamEvent[]>([]);

  // Refs
  const eventSourceManagerRef = useRef<EventSourceManager | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Store actions
  const {
    addMessage,
    updateMessage,
    addStreamEvent,
    clearStreamEvents,
    setStreaming: setChatStreaming,
    updateTodos,
    currentSessionId
  } = useChatStore();

  const { setCurrentSession, updateSession } = useSessionStore();
  const notifications = useNotificationActions();

  // Create unique message ID for this stream
  const generateMessageId = useCallback(() => {
    return `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle stream events
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    console.log('Stream event received:', event);
    
    // Add event to store and local state
    addStreamEvent(event);
    setEvents(prev => [...prev, event]);

    // Handle specific event types
    switch (event.event_type) {
      case 'planning':
        // Update current message with planning content
        if (currentMessageIdRef.current) {
          updateMessage(currentMessageIdRef.current, {
            content: event.content,
            timestamp: event.timestamp || new Date().toISOString(),
          });
        }
        break;

      case 'tool_call':
        // Show tool execution notification
        notifications.info(`Executing tool: ${event.tool_name}`, event.content);
        break;

      case 'tool_output':
        if (!event.success) {
          notifications.warning(`Tool failed: ${event.tool_name}`, event.content);
        }
        break;

      case 'todos_updated':
        const todosEvent = event as StreamEvent & { event_type: 'todos_updated'; todos: any[] };
        updateTodos(todosEvent.todos);
        break;

      case 'final_result':
        // Update current message with final result
        if (currentMessageIdRef.current) {
          updateMessage(currentMessageIdRef.current, {
            content: event.content,
            timestamp: event.timestamp || new Date().toISOString(),
            metadata: {
              ...event.metadata,
              model: 'azure-gpt-4.1', // Default model
            },
          });
        }
        
        // Update session with query count
        if (currentSessionId) {
          updateSession(currentSessionId, {
            query_count: events.filter(e => e.event_type === 'final_result').length + 1,
            last_activity: new Date().toISOString(),
          });
        }
        break;

      case 'error':
        const errorEvent = event as StreamEvent & { event_type: 'error' };
        const errorMessage = `Stream error: ${errorEvent.error}`;
        setError(new Error(errorMessage));
        notifications.error('Streaming Error', errorEvent.error);
        break;

      case 'complete':
        notifications.success('Analysis Complete', 'The biomedical analysis has finished successfully.');
        break;
    }

    // Call custom event handler
    options.onEvent?.(event);
  }, [addStreamEvent, updateMessage, updateTodos, currentSessionId, updateSession, notifications, options, events]);

  // Handle stream errors
  const handleStreamError = useCallback((error: Error) => {
    console.error('Stream error:', error);
    setError(error);
    setIsStreaming(false);
    setChatStreaming(false);
    setConnectionState('error');
    
    notifications.error('Connection Error', error.message);
    options.onError?.(error);
  }, [setChatStreaming, notifications, options]);

  // Handle stream completion
  const handleStreamComplete = useCallback(() => {
    console.log('Stream completed');
    setIsStreaming(false);
    setChatStreaming(false);
    setConnectionState('disconnected');
    
    options.onComplete?.(options);
  }, [setChatStreaming, options]);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: any) => {
    setConnectionState(state.status);
    
    if (state.status === 'connected' && state.reconnectAttempts > 0) {
      notifications.success('Reconnected', 'Connection to the server has been restored.');
    }
  }, [notifications]);

  // Start streaming
  const startStream = useCallback(async (config: StreamQueryConfig) => {
    try {
      // Clear previous state
      setError(null);
      setEvents([]);
      clearStreamEvents();
      
      // Create user message
      const messageId = generateMessageId();
      currentMessageIdRef.current = messageId;
      
      const userMessage: Message = {
        id: `user-${messageId}`,
        type: 'user',
        content: config.prompt,
        timestamp: new Date().toISOString(),
        files: config.file_ids ? [] : undefined, // TODO: Add file metadata
      };
      
      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: messageId,
        type: 'assistant',
        content: 'Thinking...',
        timestamp: new Date().toISOString(),
        metadata: {
          model: config.model || 'azure-gpt-4.1',
        },
      };

      // Add messages to store
      addMessage(userMessage);
      addMessage(assistantMessage);

      // Set session if provided
      if (config.session_id) {
        setCurrentSession(config.session_id);
        apiClient.setSessionId(config.session_id);
      }

      // Generate streaming URL
      const streamUrl = apiClient.generateStreamUrl({
        prompt: config.prompt,
        model: config.model || 'azure-gpt-4.1',
        session_id: config.session_id || currentSessionId || undefined,
        file_ids: config.file_ids,
      });

      // Create EventSource manager
      const manager = new EventSourceManager({
        url: streamUrl,
        reconnectAttempts: options.maxReconnectAttempts || 5,
        reconnectDelay: 1000,
        heartbeatInterval: 30000,
      });

      // Set up event handlers
      manager.on('event', handleStreamEvent);
      manager.onError(handleStreamError);
      manager.onComplete(handleStreamComplete);
      manager.onStateChange(handleConnectionStateChange);

      // Store manager reference
      eventSourceManagerRef.current = manager;

      // Update state
      setIsStreaming(true);
      setChatStreaming(true);
      setConnectionState('connecting');

      // Connect to stream
      manager.connect();

    } catch (error) {
      console.error('Failed to start stream:', error);
      const errorMessage = error instanceof Error ? error : new Error('Failed to start streaming');
      handleStreamError(errorMessage);
    }
  }, [
    clearStreamEvents,
    generateMessageId,
    addMessage,
    setCurrentSession,
    currentSessionId,
    setChatStreaming,
    handleStreamEvent,
    handleStreamError,
    handleStreamComplete,
    handleConnectionStateChange,
    options.maxReconnectAttempts
  ]);

  // Stop streaming
  const stopStream = useCallback(() => {
    if (eventSourceManagerRef.current) {
      eventSourceManagerRef.current.disconnect();
      eventSourceManagerRef.current = null;
    }
    
    setIsStreaming(false);
    setChatStreaming(false);
    setConnectionState('disconnected');
    currentMessageIdRef.current = null;
  }, [setChatStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceManagerRef.current) {
        eventSourceManagerRef.current.disconnect();
      }
    };
  }, []);

  return {
    startStream,
    stopStream,
    isStreaming,
    error,
    connectionState,
    events,
  };
}

export default useStreamingQuery;