/**
 * Chat Store - Main state management for chat interface
 * Uses Zustand with persistence and dev tools
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { StreamEvent, TodoItem } from '../types/streaming';
import type { Message } from '../types/components';
import type { FileMetadata } from '../types/api';

interface ChatState {
  // Messages and conversation
  messages: Message[];
  streamingEvents: StreamEvent[];
  isStreaming: boolean;
  currentSessionId: string | null;
  
  // Todo tracking
  todos: TodoItem[];
  
  // File management
  uploadedFiles: FileMetadata[];
  uploadProgress: Record<string, number>;
  
  // UI state
  expandedSections: Set<string>;
  rightPanelVisible: boolean;
  
  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  
  addStreamEvent: (event: StreamEvent) => void;
  clearStreamEvents: () => void;
  setStreaming: (streaming: boolean) => void;
  
  updateTodos: (todos: TodoItem[]) => void;
  updateSingleTodo: (todo: TodoItem) => void;
  
  addUploadedFile: (file: FileMetadata) => void;
  removeUploadedFile: (fileId: string) => void;
  setUploadProgress: (fileId: string, progress: number) => void;
  
  toggleSection: (sectionId: string) => void;
  setRightPanelVisible: (visible: boolean) => void;
  
  setCurrentSession: (sessionId: string | null) => void;
  
  // Reset all state (for new session)
  resetState: () => void;
}

const initialState = {
  messages: [],
  streamingEvents: [],
  isStreaming: false,
  currentSessionId: null,
  todos: [],
  uploadedFiles: [],
  uploadProgress: {},
  expandedSections: new Set<string>(),
  rightPanelVisible: true,
};

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Message actions
        addMessage: (message) =>
          set((state) => {
            state.messages.push(message);
          }),

        updateMessage: (id, updates) =>
          set((state) => {
            const index = state.messages.findIndex(m => m.id === id);
            if (index !== -1) {
              Object.assign(state.messages[index], updates);
            }
          }),

        clearMessages: () =>
          set((state) => {
            state.messages = [];
          }),

        // Streaming actions
        addStreamEvent: (event) =>
          set((state) => {
            state.streamingEvents.push(event);
            
            // Handle special event types
            if (event.event_type === 'todos_updated') {
              const todosEvent = event as StreamEvent & { event_type: 'todos_updated'; todos: TodoItem[] };
              state.todos = todosEvent.todos;
            }
            
            if (event.event_type === 'complete') {
              state.isStreaming = false;
            }
          }),

        clearStreamEvents: () =>
          set((state) => {
            state.streamingEvents = [];
          }),

        setStreaming: (streaming) =>
          set((state) => {
            state.isStreaming = streaming;
            if (!streaming) {
              // Auto-expand final result when streaming stops
              const finalResultEvents = state.streamingEvents.filter(e => e.event_type === 'final_result');
              if (finalResultEvents.length > 0) {
                finalResultEvents.forEach((_, index) => {
                  state.expandedSections.add(`final_result-${index}`);
                });
              }
            }
          }),

        // Todo actions
        updateTodos: (todos) =>
          set((state) => {
            state.todos = todos;
          }),

        updateSingleTodo: (todo) =>
          set((state) => {
            const index = state.todos.findIndex(t => t.id === todo.id);
            if (index !== -1) {
              state.todos[index] = todo;
            } else {
              state.todos.push(todo);
            }
          }),

        // File actions
        addUploadedFile: (file) =>
          set((state) => {
            const existingIndex = state.uploadedFiles.findIndex(f => f.id === file.id);
            if (existingIndex !== -1) {
              state.uploadedFiles[existingIndex] = file;
            } else {
              state.uploadedFiles.push(file);
            }
          }),

        removeUploadedFile: (fileId) =>
          set((state) => {
            state.uploadedFiles = state.uploadedFiles.filter(f => f.id !== fileId);
            delete state.uploadProgress[fileId];
          }),

        setUploadProgress: (fileId, progress) =>
          set((state) => {
            state.uploadProgress[fileId] = progress;
          }),

        // UI actions
        toggleSection: (sectionId) =>
          set((state) => {
            if (state.expandedSections.has(sectionId)) {
              state.expandedSections.delete(sectionId);
            } else {
              state.expandedSections.add(sectionId);
            }
          }),

        setRightPanelVisible: (visible) =>
          set((state) => {
            state.rightPanelVisible = visible;
          }),

        // Session actions
        setCurrentSession: (sessionId) =>
          set((state) => {
            state.currentSessionId = sessionId;
          }),

        // Reset state
        resetState: () =>
          set((state) => {
            Object.assign(state, {
              ...initialState,
              currentSessionId: state.currentSessionId, // Keep session ID
              expandedSections: new Set<string>(), // Reset to new Set
            });
          }),
      })),
      {
        name: 'biomni-chat-store',
        partialize: (state) => ({
          // Only persist essential data
          messages: state.messages,
          currentSessionId: state.currentSessionId,
          uploadedFiles: state.uploadedFiles,
          rightPanelVisible: state.rightPanelVisible,
        }),
        // Convert Set to Array for serialization
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            
            const parsed = JSON.parse(str);
            // Convert expandedSections array back to Set
            if (parsed.state.expandedSections) {
              parsed.state.expandedSections = new Set(parsed.state.expandedSections);
            }
            return parsed;
          },
          setItem: (name, value) => {
            // Convert expandedSections Set to Array for storage
            const toStore = {
              ...value,
              state: {
                ...value.state,
                expandedSections: Array.from(value.state.expandedSections || [])
              }
            };
            localStorage.setItem(name, JSON.stringify(toStore));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    ),
    {
      name: 'biomni-chat-store',
    }
  )
);

// Selectors for optimized re-renders
export const useMessages = () => useChatStore((state) => state.messages);
export const useStreamingEvents = () => useChatStore((state) => state.streamingEvents);
export const useIsStreaming = () => useChatStore((state) => state.isStreaming);
export const useTodos = () => useChatStore((state) => state.todos);
export const useUploadedFiles = () => useChatStore((state) => state.uploadedFiles);
export const useCurrentSession = () => useChatStore((state) => state.currentSessionId);
export const useRightPanelVisible = () => useChatStore((state) => state.rightPanelVisible);

// Computed selectors
export const useLatestMessage = () => 
  useChatStore((state) => state.messages[state.messages.length - 1]);

export const useCompletedTodos = () =>
  useChatStore((state) => state.todos.filter(t => t.status === 'completed'));

export const usePendingTodos = () =>
  useChatStore((state) => state.todos.filter(t => t.status === 'pending'));

export const useInProgressTodos = () =>
  useChatStore((state) => state.todos.filter(t => t.status === 'in_progress'));

export const useEventsByType = (eventType: StreamEvent['event_type']) =>
  useChatStore((state) => state.streamingEvents.filter(e => e.event_type === eventType));

export const useVisualizationEvents = () =>
  useChatStore((state) => 
    state.streamingEvents.filter(e => e.event_type === 'visualization') as Array<StreamEvent & { event_type: 'visualization' }>
  );

export const useFileReferences = () =>
  useChatStore((state) => {
    const fileIds = new Set<string>();
    
    // Extract file references from messages
    state.messages.forEach(message => {
      if (message.files) {
        message.files.forEach(file => fileIds.add(file.id));
      }
      
      // Also check message content for @file: references
      const fileMatches = message.content.match(/@file:([a-f0-9-]+)/g);
      if (fileMatches) {
        fileMatches.forEach(match => {
          const fileId = match.replace('@file:', '');
          fileIds.add(fileId);
        });
      }
    });
    
    // Return files that are referenced
    return state.uploadedFiles.filter(file => fileIds.has(file.id));
  });

export default useChatStore;