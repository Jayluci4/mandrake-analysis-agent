/**
 * Custom hook for handling Biomni streaming responses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import biomniApi, { StreamingEventHandler } from '../services/biomniApi';
import type { StreamEvent } from '../types/streaming';

interface UseBiomniStreamOptions {
  onEvent?: (event: StreamEvent) => void;
  onComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  useMockApi?: boolean; // For development
  apiEndpoint?: string; // Custom API endpoint
}

export const useBiomniStream = (options: UseBiomniStreamOptions = {}) => {
  const { onEvent, onComplete, onError, useMockApi = true, apiEndpoint } = options;
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingEvents, setStreamingEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  const streamHandlerRef = useRef<StreamingEventHandler | null>(null);
  const addMessage = useChatStore((state) => state.addMessage);
  const activeSessionId = useSessionStore((state) => state.currentSessionId);

  // Send message and start streaming
  const sendMessage = useCallback(async (
    content: string,
    fileIds?: string[]
  ) => {
    if (!content.trim()) return;
    
    // IMPORTANT: Clean up any existing connection first
    if (streamHandlerRef.current) {
      streamHandlerRef.current.disconnect();
      streamHandlerRef.current = null;
    }
    
    setIsStreaming(true);
    setError(null);
    setStreamingEvents([]); // Clear all previous events

    // Add user message to store
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user' as const,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      files: fileIds,
    };
    addMessage(userMessage);

    try {
      if (useMockApi) {
        // Use mock API for development
        biomniApi.mock.simulateStream(
          content,
          (event) => {
            setStreamingEvents(prev => [...prev, event]);
            onEvent?.(event);
          },
          (response) => {
            // Add assistant message
            const assistantMessage = {
              id: `assistant-${Date.now()}`,
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
      } else {
        // Use real API
        const sessionId = activeSessionId || 'default';
        
        let url: string;
        if (apiEndpoint) {
          // Use custom endpoint
          const params = new URLSearchParams({
            message: content,
            session_id: sessionId,
          });
          
          if (fileIds && fileIds.length > 0) {
            params.append('file_ids', fileIds.join(','));
          }
          
          url = `${apiEndpoint}?${params.toString()}`;
        } else {
          // Use default biomniApi
          const response = await biomniApi.chat.sendMessage(content, sessionId, fileIds);
          url = response.url;
        }

        // Create streaming handler (only if not already streaming)
        if (!streamHandlerRef.current) {
          const handler = new StreamingEventHandler(url);
          streamHandlerRef.current = handler;

          // Register event handlers
          handler.on('*', (event) => {
            setStreamingEvents(prev => [...prev, event]);
            onEvent?.(event);
          });

          handler.on('final_answer', (event: any) => {
            // Add assistant message
            const assistantMessage = {
              id: `assistant-${Date.now()}`,
              type: 'assistant' as const,
              content: event.content,
              timestamp: new Date().toISOString(),
              metadata: event.metadata || {},
            };
            addMessage(assistantMessage);
            onComplete?.(event.content);
          });

          handler.on('done', (event: any) => {
            // Stream is complete - stop streaming and disconnect
            setIsStreaming(false);
            handler.disconnect();
            streamHandlerRef.current = null;
          });

          handler.on('error', (event: any) => {
            const error = new Error(event.error || 'Stream error');
            setError(error);
            setIsStreaming(false);
            onError?.(error);
          });
          // Connect to stream
          handler.connect();
        } else {
          console.warn('Already streaming, ignoring duplicate request');
          return;
        }
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
    useMockApi,
    apiEndpoint,
    activeSessionId,
    addMessage,
    onEvent,
    onComplete,
    onError,
  ]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (streamHandlerRef.current) {
      streamHandlerRef.current.disconnect();
      streamHandlerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamHandlerRef.current) {
        streamHandlerRef.current.disconnect();
      }
    };
  }, []);

  return {
    sendMessage,
    stopStreaming,
    isStreaming,
    streamingEvents,
    error,
  };
};

/**
 * Hook for file uploads with Biomni
 */
export const useBiomniFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  
  const activeSessionId = useSessionStore((state) => state.currentSessionId);
  const addMessage = useChatStore((state) => state.addMessage);

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const uploadedFiles = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((i / files.length) * 100);
        
        // Upload file
        const result = await biomniApi.file.upload(
          file,
          activeSessionId || undefined
        );
        
        uploadedFiles.push(result);
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
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [activeSessionId, addMessage]);

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    error,
  };
};