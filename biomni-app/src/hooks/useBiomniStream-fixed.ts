/**
 * FIXED: Custom hook for handling Biomni streaming responses
 * Includes proper cleanup, error handling, and race condition prevention
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import biomniApi, { StreamingEventHandler } from '../services/biomniApi';
import type { StreamEvent } from '../types/streaming';

interface UseBiomniStreamOptions {
  onEvent?: (event: StreamEvent) => void;
  onComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  useMockApi?: boolean;
  debounceMs?: number; // Debounce rapid events
}

export const useBiomniStream = (options: UseBiomniStreamOptions = {}) => {
  const { 
    onEvent, 
    onComplete, 
    onError, 
    useMockApi = true,
    debounceMs = 100 
  } = options;
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingEvents, setStreamingEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to prevent stale closure issues
  const streamHandlerRef = useRef<StreamingEventHandler | null>(null);
  const mockCleanupRef = useRef<(() => void) | null>(null);
  const eventProcessingRef = useRef<{
    processing: boolean;
    queue: StreamEvent[];
    lastProcessedId: string | null;
  }>({
    processing: false,
    queue: [],
    lastProcessedId: null
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  const addMessage = useChatStore((state) => state.addMessage);
  const activeSessionId = useSessionStore((state) => state.currentSessionId);

  // Memoize the session ID to prevent unnecessary re-renders
  const currentSessionId = useMemo(() => activeSessionId, [activeSessionId]);

  // Enhanced event processing with queue management
  const processEventQueue = useCallback(() => {
    if (eventProcessingRef.current.processing || eventProcessingRef.current.queue.length === 0) {
      return;
    }

    eventProcessingRef.current.processing = true;

    try {
      const eventsToProcess = [...eventProcessingRef.current.queue];
      eventProcessingRef.current.queue = [];

      // Process events in batches to prevent UI blocking
      const processBatch = (batch: StreamEvent[]) => {
        setStreamingEvents(prev => {
          // Filter out any duplicate events based on timestamp and type
          const existingEventIds = new Set(prev.map(e => `${e.event_type}-${e.timestamp}`));
          const newEvents = batch.filter(e => !existingEventIds.has(`${e.event_type}-${e.timestamp}`));
          
          return [...prev, ...newEvents];
        });

        // Call the external event handler for each new event
        batch.forEach(event => {
          try {
            onEvent?.(event);
          } catch (error) {
            console.error('Error in onEvent handler:', error);
          }
        });
      };

      // Process in smaller chunks to prevent blocking
      const chunkSize = 5;
      for (let i = 0; i < eventsToProcess.length; i += chunkSize) {
        const chunk = eventsToProcess.slice(i, i + chunkSize);
        processBatch(chunk);
      }

    } finally {
      eventProcessingRef.current.processing = false;
      
      // Process any events that were queued while we were processing
      if (eventProcessingRef.current.queue.length > 0) {
        setTimeout(processEventQueue, 0);
      }
    }
  }, [onEvent]);

  // Debounced event handler to prevent rapid updates
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    // Add event to processing queue
    eventProcessingRef.current.queue.push(event);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      processEventQueue();
    }, debounceMs);
  }, [processEventQueue, debounceMs]);

  // Clean up function to ensure proper cleanup
  const cleanupStreaming = useCallback(() => {
    console.log('Cleaning up streaming resources');
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }

    // Cleanup real API handler
    if (streamHandlerRef.current) {
      streamHandlerRef.current.disconnect();
      streamHandlerRef.current = null;
    }

    // Cleanup mock API
    if (mockCleanupRef.current) {
      mockCleanupRef.current();
      mockCleanupRef.current = null;
    }

    // Clear event processing queue
    eventProcessingRef.current = {
      processing: false,
      queue: [],
      lastProcessedId: null
    };

    setIsStreaming(false);
  }, []);

  // Send message and start streaming
  const sendMessage = useCallback(async (
    content: string,
    fileIds?: string[]
  ) => {
    if (!content.trim()) return;
    
    // Prevent concurrent requests
    if (isStreaming) {
      console.warn('Already streaming, ignoring duplicate request');
      return;
    }
    
    // Clean up any existing connections first
    cleanupStreaming();
    
    setIsStreaming(true);
    setError(null);
    setStreamingEvents([]); // Clear all previous events

    // Add user message to store
    const userMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user' as const,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      files: fileIds,
    };
    addMessage(userMessage);

    try {
      if (useMockApi) {
        // Use mock API for development
        const cleanup = biomniApi.mock.simulateStream(
          content,
          handleStreamEvent,
          (response) => {
            // Add assistant message
            const assistantMessage = {
              id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'assistant' as const,
              content: response,
              timestamp: new Date().toISOString(),
              metadata: {
                model: 'Azure GPT-4.1',
                tokens: Math.floor(Math.random() * 500) + 100,
              },
            };
            addMessage(assistantMessage);
            setIsStreaming(false);
            onComplete?.(response);
          }
        );
        
        // Store cleanup function
        mockCleanupRef.current = cleanup;
        
      } else {
        // Use real API with enhanced error handling
        const sessionId = currentSessionId || 'default';
        const { url } = await biomniApi.chat.sendMessage(
          content,
          sessionId,
          fileIds
        );

        // Create streaming handler with proper cleanup
        const handler = new StreamingEventHandler(url);
        streamHandlerRef.current = handler;

        // Register event handlers with error protection
        handler.on('*', (event) => {
          handleStreamEvent(event);
        });

        handler.on('final_result', (event: any) => {
          // Add assistant message
          const assistantMessage = {
            id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant' as const,
            content: event.content,
            timestamp: new Date().toISOString(),
            metadata: event.metadata,
          };
          addMessage(assistantMessage);
          setIsStreaming(false);
          onComplete?.(event.content);
        });

        handler.on('error', (event: any) => {
          const error = new Error(event.error || 'Stream error');
          setError(error);
          setIsStreaming(false);
          onError?.(error);
        });

        // Add cleanup callback to handler
        handler.addCleanupCallback(() => {
          setIsStreaming(false);
        });

        // Connect to stream
        handler.connect();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      setIsStreaming(false);
      onError?.(error);
      
      // Add error message to chat
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'system' as const,
        content: `❌ Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
    }
  }, [
    isStreaming,
    currentSessionId,
    useMockApi,
    addMessage,
    onComplete,
    onError,
    handleStreamEvent,
    cleanupStreaming,
  ]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    cleanupStreaming();
  }, [cleanupStreaming]);

  // Cleanup on unmount or when dependencies change
  useEffect(() => {
    return () => {
      cleanupStreaming();
    };
  }, [cleanupStreaming]);

  // Monitor for session changes and cleanup if needed
  useEffect(() => {
    if (isStreaming && !currentSessionId) {
      console.log('Session cleared while streaming, stopping stream');
      stopStreaming();
    }
  }, [currentSessionId, isStreaming, stopStreaming]);

  return {
    sendMessage,
    stopStreaming,
    isStreaming,
    streamingEvents,
    error,
    connectionStatus: streamHandlerRef.current?.getConnectionStatus() || null,
  };
};

/**
 * FIXED: Hook for file uploads with Biomni
 * Enhanced with proper error handling and progress tracking
 */
export const useBiomniFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  
  const activeSessionId = useSessionStore((state) => state.currentSessionId);
  const addMessage = useChatStore((state) => state.addMessage);

  // Abort controller for cancelling uploads
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (isUploading) {
      console.warn('Upload already in progress');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setUploadedFileIds([]);

    // Create abort controller for this upload session
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const uploadedFiles = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        // Check if upload was cancelled
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const file = files[i];
        const progressPerFile = 100 / files.length;
        const baseProgress = i * progressPerFile;
        
        // Update progress for current file
        setUploadProgress(baseProgress);
        
        // Upload file with timeout protection
        const uploadPromise = biomniApi.file.upload(
          file,
          activeSessionId || undefined
        );

        // Add timeout to upload
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout')), 30000);
        });

        const result = await Promise.race([uploadPromise, timeoutPromise]);
        
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }
        
        uploadedFiles.push(result);
        setUploadedFileIds(prev => [...prev, result.id]);
        
        // Update progress for completed file
        setUploadProgress(baseProgress + progressPerFile);
      }
      
      setUploadProgress(100);
      
      // Add system message about uploads
      const uploadMessage = {
        id: `upload-${Date.now()}`,
        type: 'system' as const,
        content: `📎 Uploaded ${uploadedFiles.length} file(s): ${uploadedFiles.map(f => f.name).join(', ')}`,
        timestamp: new Date().toISOString(),
        files: uploadedFiles,
      };
      addMessage(uploadMessage);
      
      return uploadedFiles;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      
      // Add error message
      const errorMessage = {
        id: `upload-error-${Date.now()}`,
        type: 'system' as const,
        content: `❌ Upload failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
      
      throw error;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [isUploading, activeSessionId, addMessage]);

  // Cancel upload function
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setError(new Error('Upload cancelled by user'));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    uploadFiles,
    cancelUpload,
    isUploading,
    uploadProgress,
    uploadedFileIds,
    error,
  };
};