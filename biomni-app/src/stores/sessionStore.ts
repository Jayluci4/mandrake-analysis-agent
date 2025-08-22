/**
 * Session Store - Manages multiple chat sessions and history
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { SessionData, SessionSummary } from '../types/api';

interface SessionState {
  // Session data
  sessions: SessionSummary[];
  sessionData: Record<string, SessionData>;
  currentSessionId: string | null;
  
  // Loading states
  isLoadingSessions: boolean;
  isLoadingSession: boolean;
  
  // Actions
  setSessions: (sessions: SessionSummary[]) => void;
  addSession: (session: SessionSummary) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<SessionSummary>) => void;
  
  setSessionData: (sessionId: string, data: SessionData) => void;
  clearSessionData: (sessionId: string) => void;
  
  setCurrentSession: (sessionId: string | null) => void;
  
  setLoadingSessions: (loading: boolean) => void;
  setLoadingSession: (loading: boolean) => void;
  
  // Create a new session
  createNewSession: () => string;
  
  // Get session by ID
  getSession: (sessionId: string) => SessionSummary | undefined;
  getSessionData: (sessionId: string) => SessionData | undefined;
  
  // Clear all data
  clearAllSessions: () => void;
}

const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const createNewSessionSummary = (id: string): SessionSummary => ({
  id,
  created_at: new Date().toISOString(),
  last_activity: new Date().toISOString(),
  query_count: 0,
});

export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      immer((set, get) => ({
        sessions: [],
        sessionData: {},
        currentSessionId: null,
        isLoadingSessions: false,
        isLoadingSession: false,

        setSessions: (sessions) =>
          set((state) => {
            state.sessions = sessions.sort((a, b) => 
              new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
            );
          }),

        addSession: (session) =>
          set((state) => {
            const existingIndex = state.sessions.findIndex(s => s.id === session.id);
            if (existingIndex !== -1) {
              state.sessions[existingIndex] = session;
            } else {
              state.sessions.unshift(session); // Add to beginning
            }
            
            // Sort by last activity
            state.sessions.sort((a, b) => 
              new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
            );
          }),

        removeSession: (sessionId) =>
          set((state) => {
            state.sessions = state.sessions.filter(s => s.id !== sessionId);
            delete state.sessionData[sessionId];
            
            if (state.currentSessionId === sessionId) {
              state.currentSessionId = null;
            }
          }),

        updateSession: (sessionId, updates) =>
          set((state) => {
            const index = state.sessions.findIndex(s => s.id === sessionId);
            if (index !== -1) {
              Object.assign(state.sessions[index], updates);
              state.sessions[index].last_activity = new Date().toISOString();
              
              // Re-sort after update
              state.sessions.sort((a, b) => 
                new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
              );
            }
          }),

        setSessionData: (sessionId, data) =>
          set((state) => {
            state.sessionData[sessionId] = data;
          }),

        clearSessionData: (sessionId) =>
          set((state) => {
            delete state.sessionData[sessionId];
          }),

        setCurrentSession: (sessionId) =>
          set((state) => {
            state.currentSessionId = sessionId;
            
            // Update last activity for the session
            if (sessionId) {
              const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
              if (sessionIndex !== -1) {
                state.sessions[sessionIndex].last_activity = new Date().toISOString();
                
                // Re-sort after activity update
                state.sessions.sort((a, b) => 
                  new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
                );
              }
            }
          }),

        setLoadingSessions: (loading) =>
          set((state) => {
            state.isLoadingSessions = loading;
          }),

        setLoadingSession: (loading) =>
          set((state) => {
            state.isLoadingSession = loading;
          }),

        createNewSession: () => {
          const sessionId = generateSessionId();
          const newSession = createNewSessionSummary(sessionId);
          
          set((state) => {
            state.sessions.unshift(newSession);
            state.currentSessionId = sessionId;
          });
          
          return sessionId;
        },

        getSession: (sessionId) => {
          return get().sessions.find(s => s.id === sessionId);
        },

        getSessionData: (sessionId) => {
          return get().sessionData[sessionId];
        },

        clearAllSessions: () =>
          set((state) => {
            state.sessions = [];
            state.sessionData = {};
            state.currentSessionId = null;
          }),
      })),
      {
        name: 'biomni-session-store',
        partialize: (state) => ({
          sessions: state.sessions,
          currentSessionId: state.currentSessionId,
          // Don't persist sessionData as it can be large
        }),
      }
    ),
    {
      name: 'biomni-session-store',
    }
  )
);

// Selectors
export const useSessions = () => useSessionStore((state) => state.sessions);
export const useCurrentSessionId = () => useSessionStore((state) => state.currentSessionId);
export const useIsLoadingSessions = () => useSessionStore((state) => state.isLoadingSessions);
export const useIsLoadingSession = () => useSessionStore((state) => state.isLoadingSession);

export const useCurrentSession = () => 
  useSessionStore((state) => {
    if (!state.currentSessionId) return null;
    return state.sessions.find(s => s.id === state.currentSessionId) || null;
  });

export const useCurrentSessionData = () =>
  useSessionStore((state) => {
    if (!state.currentSessionId) return null;
    return state.sessionData[state.currentSessionId] || null;
  });

export const useRecentSessions = (limit: number = 10) =>
  useSessionStore((state) => state.sessions.slice(0, limit));

export const useSessionCount = () => useSessionStore((state) => state.sessions.length);

export const useHasActiveSessions = () => 
  useSessionStore((state) => state.sessions.length > 0);

// Session management helpers
export const useSessionActions = () => {
  const store = useSessionStore();
  
  return {
    createNewSession: store.createNewSession,
    setCurrentSession: store.setCurrentSession,
    updateSession: store.updateSession,
    removeSession: store.removeSession,
    getSession: store.getSession,
    getSessionData: store.getSessionData,
  };
};

// Individual action hooks for convenience
export const useActiveSessionId = () => useSessionStore((state) => state.currentSessionId);
export const useSetActiveSession = () => useSessionStore((state) => state.setCurrentSession);
export const useCreateSession = () => useSessionStore((state) => state.createNewSession);

export default useSessionStore;