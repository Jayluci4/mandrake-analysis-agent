/**
 * FIXED: Chat Store - Enhanced state management with proper cleanup and memory limits
 * Uses Zustand with persistence, dev tools, and memory management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { StreamEvent, TodoItem } from '../types/streaming';
import type { Message } from '../types/components';
import type { FileMetadata } from '../types/api';

// Constants for memory management
const MAX_MESSAGES = 100;
const MAX_STREAMING_EVENTS = 50;
const MAX_TODOS = 20;
const MAX_UPLOADED_FILES = 10;

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
  
  // UI state - simplified to avoid Set serialization issues
  expandedSections: string[]; // Changed from Set to Array
  rightPanelVisible: boolean;
  
  // Performance tracking
  lastCleanup: number;
  memoryUsage: {
    messages: number;
    events: number;
    todos: number;
    files: number;
  };
  
  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  
  addStreamEvent: (event: StreamEvent) => void;
  clearStreamEvents: () => void;
  setStreaming: (streaming: boolean) => void;
  
  updateTodos: (todos: TodoItem[]) => void;
  updateSingleTodo: (todo: TodoItem) => void;
  clearTodos: () => void;
  
  addUploadedFile: (file: FileMetadata) => void;
  removeUploadedFile: (fileId: string) => void;
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadedFiles: () => void;
  
  toggleSection: (sectionId: string) => void;
  setSectionExpanded: (sectionId: string, expanded: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  
  setCurrentSession: (sessionId: string | null) => void;
  
  // Memory management
  cleanup: () => void;
  getMemoryUsage: () => ChatState['memoryUsage'];
  
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
  expandedSections: [], // Array instead of Set
  rightPanelVisible: true,
  lastCleanup: Date.now(),
  memoryUsage: {
    messages: 0,
    events: 0,
    todos: 0,
    files: 0,
  },
};

// Utility function to validate and clean state on rehydration
const validateAndCleanState = (state: any): Partial<ChatState> => {
  const cleaned: any = { ...initialState };
  
  try {
    // Validate and clean messages
    if (Array.isArray(state.messages)) {
      cleaned.messages = state.messages
        .filter((msg: any) => msg && typeof msg.id === 'string' && typeof msg.content === 'string')
        .slice(-MAX_MESSAGES);
    }
    
    // Validate session ID
    if (typeof state.currentSessionId === 'string' || state.currentSessionId === null) {
      cleaned.currentSessionId = state.currentSessionId;
    }
    
    // Validate uploaded files
    if (Array.isArray(state.uploadedFiles)) {
      cleaned.uploadedFiles = state.uploadedFiles
        .filter((file: any) => file && typeof file.id === 'string')
        .slice(-MAX_UPLOADED_FILES);
    }
    
    // Validate UI state
    if (typeof state.rightPanelVisible === 'boolean') {
      cleaned.rightPanelVisible = state.rightPanelVisible;
    }
    
    // Validate expanded sections (ensure it's an array)
    if (Array.isArray(state.expandedSections)) {
      cleaned.expandedSections = state.expandedSections.filter(id => typeof id === 'string');
    } else if (state.expandedSections && typeof state.expandedSections === 'object') {
      // Convert Set to Array if needed (backwards compatibility)
      cleaned.expandedSections = Array.from(state.expandedSections);
    }
    
    console.log('State validated and cleaned on rehydration');
    return cleaned;
  } catch (error) {
    console.error('Error validating state, using defaults:', error);
    return initialState;
  }
};

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Message actions with memory management
        addMessage: (message) =>
          set((state) => {
            state.messages.push(message);
            
            // Enforce memory limits
            if (state.messages.length > MAX_MESSAGES) {
              state.messages = state.messages.slice(-MAX_MESSAGES);
            }
            
            state.memoryUsage.messages = state.messages.length;
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
            state.memoryUsage.messages = 0;
          }),

        // Streaming actions with enhanced memory management
        addStreamEvent: (event) =>
          set((state) => {
            // Check for duplicate events
            const eventKey = `${event.event_type}-${event.timestamp}`;
            const exists = state.streamingEvents.some(e => 
              `${e.event_type}-${e.timestamp}` === eventKey
            );
            
            if (!exists) {
              state.streamingEvents.push(event);
              
              // Enforce memory limits
              if (state.streamingEvents.length > MAX_STREAMING_EVENTS) {
                state.streamingEvents = state.streamingEvents.slice(-MAX_STREAMING_EVENTS);
              }
            }
            
            // Handle special event types
            if (event.event_type === 'todos_updated') {
              const todosEvent = event as StreamEvent & { event_type: 'todos_updated'; todos: TodoItem[] };
              if (todosEvent.todos) {
                state.todos = todosEvent.todos.slice(-MAX_TODOS);
                state.memoryUsage.todos = state.todos.length;
              }
            }
            
            if (event.event_type === 'complete') {
              state.isStreaming = false;
            }
            
            state.memoryUsage.events = state.streamingEvents.length;
          }),

        clearStreamEvents: () =>
          set((state) => {
            state.streamingEvents = [];
            state.memoryUsage.events = 0;
          }),

        setStreaming: (streaming) =>
          set((state) => {
            state.isStreaming = streaming;
            if (!streaming) {
              // Auto-expand final result when streaming stops
              const finalResultEvents = state.streamingEvents.filter(e => e.event_type === 'final_result');
              if (finalResultEvents.length > 0) {
                finalResultEvents.forEach((_, index) => {
                  const sectionId = `final_result-${index}`;
                  if (!state.expandedSections.includes(sectionId)) {
                    state.expandedSections.push(sectionId);
                  }
                });
              }
            }
          }),

        // Todo actions with memory limits
        updateTodos: (todos) =>
          set((state) => {
            state.todos = todos.slice(-MAX_TODOS);
            state.memoryUsage.todos = state.todos.length;
          }),

        updateSingleTodo: (todo) =>
          set((state) => {
            const index = state.todos.findIndex(t => t.id === todo.id);
            if (index !== -1) {
              state.todos[index] = todo;
            } else {
              state.todos.push(todo);
              if (state.todos.length > MAX_TODOS) {
                state.todos = state.todos.slice(-MAX_TODOS);
              }
            }
            state.memoryUsage.todos = state.todos.length;
          }),

        clearTodos: () =>
          set((state) => {
            state.todos = [];
            state.memoryUsage.todos = 0;
          }),

        // File actions with memory limits
        addUploadedFile: (file) =>
          set((state) => {
            const existingIndex = state.uploadedFiles.findIndex(f => f.id === file.id);
            if (existingIndex !== -1) {
              state.uploadedFiles[existingIndex] = file;
            } else {
              state.uploadedFiles.push(file);
              
              // Enforce memory limits
              if (state.uploadedFiles.length > MAX_UPLOADED_FILES) {
                state.uploadedFiles = state.uploadedFiles.slice(-MAX_UPLOADED_FILES);
              }
            }
            state.memoryUsage.files = state.uploadedFiles.length;
          }),

        removeUploadedFile: (fileId) =>
          set((state) => {
            state.uploadedFiles = state.uploadedFiles.filter(f => f.id !== fileId);
            delete state.uploadProgress[fileId];
            state.memoryUsage.files = state.uploadedFiles.length;
          }),

        setUploadProgress: (fileId, progress) =>
          set((state) => {
            state.uploadProgress[fileId] = progress;
          }),

        clearUploadedFiles: () =>
          set((state) => {
            state.uploadedFiles = [];
            state.uploadProgress = {};
            state.memoryUsage.files = 0;
          }),

        // UI actions - simplified section management
        toggleSection: (sectionId) =>
          set((state) => {
            const index = state.expandedSections.indexOf(sectionId);
            if (index > -1) {
              state.expandedSections.splice(index, 1);
            } else {
              state.expandedSections.push(sectionId);
            }
          }),

        setSectionExpanded: (sectionId, expanded) =>
          set((state) => {
            const index = state.expandedSections.indexOf(sectionId);
            if (expanded && index === -1) {
              state.expandedSections.push(sectionId);
            } else if (!expanded && index > -1) {
              state.expandedSections.splice(index, 1);
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

        // Memory management
        cleanup: () =>
          set((state) => {
            const now = Date.now();
            
            // Only cleanup if it's been more than 5 minutes since last cleanup
            if (now - state.lastCleanup < 5 * 60 * 1000) {
              return;
            }
            
            // Clean up old messages
            if (state.messages.length > MAX_MESSAGES) {
              state.messages = state.messages.slice(-MAX_MESSAGES);
            }
            
            // Clean up old streaming events
            if (state.streamingEvents.length > MAX_STREAMING_EVENTS) {
              state.streamingEvents = state.streamingEvents.slice(-MAX_STREAMING_EVENTS);
            }
            
            // Clean up old todos
            if (state.todos.length > MAX_TODOS) {
              state.todos = state.todos.slice(-MAX_TODOS);
            }
            
            // Clean up old files
            if (state.uploadedFiles.length > MAX_UPLOADED_FILES) {
              state.uploadedFiles = state.uploadedFiles.slice(-MAX_UPLOADED_FILES);
            }
            
            // Clean up orphaned progress entries
            const fileIds = new Set(state.uploadedFiles.map(f => f.id));
            Object.keys(state.uploadProgress).forEach(fileId => {
              if (!fileIds.has(fileId)) {
                delete state.uploadProgress[fileId];
              }
            });
            
            // Update memory usage
            state.memoryUsage = {
              messages: state.messages.length,
              events: state.streamingEvents.length,
              todos: state.todos.length,
              files: state.uploadedFiles.length,
            };
            
            state.lastCleanup = now;
            console.log('Store cleanup completed', state.memoryUsage);
          }),

        getMemoryUsage: () => {
          const state = get();
          return {
            messages: state.messages.length,
            events: state.streamingEvents.length,
            todos: state.todos.length,
            files: state.uploadedFiles.length,
          };
        },

        // Reset state with cleanup
        resetState: () =>
          set((state) => {
            Object.assign(state, {
              ...initialState,
              currentSessionId: state.currentSessionId, // Keep session ID
              rightPanelVisible: state.rightPanelVisible, // Keep UI preferences
            });
          }),
      })),
      {
        name: 'biomni-chat-store',
        version: 1, // Add version for future migrations
        partialize: (state) => ({
          // Only persist essential data to reduce storage size
          messages: state.messages.slice(-50), // Only persist last 50 messages
          currentSessionId: state.currentSessionId,
          uploadedFiles: state.uploadedFiles.slice(-5), // Only persist last 5 files
          rightPanelVisible: state.rightPanelVisible,
          expandedSections: state.expandedSections,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('Error rehydrating store:', error);
          } else if (state) {
            console.log('Store rehydrated successfully');
            // Trigger cleanup after rehydration
            setTimeout(() => state.cleanup(), 1000);
          }
        },
        // Enhanced storage with validation
        storage: {
          getItem: (name) => {
            try {
              const str = localStorage.getItem(name);
              if (!str) return null;
              
              const parsed = JSON.parse(str);
              
              // Validate and clean the state
              if (parsed.state) {
                parsed.state = validateAndCleanState(parsed.state);
              }
              
              return parsed;
            } catch (error) {
              console.error('Error parsing stored state:', error);
              return null;
            }
          },
          setItem: (name, value) => {
            try {
              // Ensure we don't store too much data
              const stringified = JSON.stringify(value);
              if (stringified.length > 1024 * 1024) { // 1MB limit
                console.warn('Store data too large, skipping persistence');
                return;
              }
              
              localStorage.setItem(name, stringified);
            } catch (error) {
              console.error('Error storing state:', error);
              // Clear storage if we hit quota
              if (error.name === 'QuotaExceededError') {
                try {
                  localStorage.removeItem(name);
                  console.log('Cleared storage due to quota exceeded');
                } catch (clearError) {
                  console.error('Failed to clear storage:', clearError);
                }
              }
            }
          },
          removeItem: (name) => {
            try {
              localStorage.removeItem(name);
            } catch (error) {
              console.error('Error removing stored state:', error);
            }
          },
        },
      }
    ),
    {
      name: 'biomni-chat-store',
    }
  )
);

// Enhanced selectors for optimized re-renders
export const useMessages = () => useChatStore((state) => state.messages);
export const useStreamingEvents = () => useChatStore((state) => state.streamingEvents);
export const useIsStreaming = () => useChatStore((state) => state.isStreaming);
export const useTodos = () => useChatStore((state) => state.todos);
export const useUploadedFiles = () => useChatStore((state) => state.uploadedFiles);
export const useCurrentSession = () => useChatStore((state) => state.currentSessionId);
export const useRightPanelVisible = () => useChatStore((state) => state.rightPanelVisible);
export const useMemoryUsage = () => useChatStore((state) => state.memoryUsage);

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
        message.files.forEach((file: any) => fileIds.add(file.id));
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

// Performance monitoring hook
export const useStorePerformance = () => {
  const store = useChatStore();
  
  return {
    memoryUsage: store.memoryUsage,
    cleanup: store.cleanup,
    getMemoryUsage: store.getMemoryUsage,
    totalItems: store.memoryUsage.messages + store.memoryUsage.events + store.memoryUsage.todos + store.memoryUsage.files,
  };
};

export default useChatStore;