/**
 * UI Store - Manages theme, settings, and global UI state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type Theme = 'light' | 'dark' | 'system';
export type PanelLayout = 'split' | 'tabs' | 'overlay';

interface UISettings {
  theme: Theme;
  panelLayout: PanelLayout;
  rightPanelWidth: number;
  leftPanelWidth: number;
  autoScroll: boolean;
  showLineNumbers: boolean;
  codeWrap: boolean;
  animationsEnabled: boolean;
  compactMode: boolean;
  showTooltips: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  densityMode: 'comfortable' | 'compact' | 'spacious';
}

interface UIState {
  // Settings
  settings: UISettings;
  
  // Panel states
  rightPanelVisible: boolean;
  leftPanelCollapsed: boolean;
  sidebarCollapsed: boolean;
  
  // Modal and overlay states
  settingsModalOpen: boolean;
  confirmDialogOpen: boolean;
  filePreviewOpen: boolean;
  helpModalOpen: boolean;
  
  // Loading and error states
  globalLoading: boolean;
  globalError: string | null;
  
  // Notifications
  notifications: Notification[];
  
  // Search and filter
  globalSearchOpen: boolean;
  globalSearchQuery: string;
  
  // Actions
  updateSettings: (updates: Partial<UISettings>) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  setRightPanelVisible: (visible: boolean) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  setSettingsModalOpen: (open: boolean) => void;
  setConfirmDialogOpen: (open: boolean) => void;
  setFilePreviewOpen: (open: boolean) => void;
  setHelpModalOpen: (open: boolean) => void;
  
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  setGlobalSearchOpen: (open: boolean) => void;
  setGlobalSearchQuery: (query: string) => void;
  
  // Reset UI state
  resetUIState: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: string;
  autoClose?: boolean;
  duration?: number;
}

const defaultSettings: UISettings = {
  theme: 'system',
  panelLayout: 'split',
  rightPanelWidth: 400,
  leftPanelWidth: 600,
  autoScroll: true,
  showLineNumbers: true,
  codeWrap: false,
  animationsEnabled: true,
  compactMode: false,
  showTooltips: true,
  fontSize: 'md',
  densityMode: 'comfortable',
};

const initialState = {
  settings: defaultSettings,
  rightPanelVisible: true,
  leftPanelCollapsed: false,
  sidebarCollapsed: false,
  settingsModalOpen: false,
  confirmDialogOpen: false,
  filePreviewOpen: false,
  helpModalOpen: false,
  globalLoading: false,
  globalError: null,
  notifications: [],
  globalSearchOpen: false,
  globalSearchQuery: '',
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Settings actions
        updateSettings: (updates) =>
          set((state) => {
            Object.assign(state.settings, updates);
            
            // Apply theme to document
            if (updates.theme) {
              applyTheme(updates.theme);
            }
          }),

        setTheme: (theme) =>
          set((state) => {
            state.settings.theme = theme;
            applyTheme(theme);
          }),

        toggleTheme: () =>
          set((state) => {
            const currentTheme = state.settings.theme;
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            state.settings.theme = newTheme;
            applyTheme(newTheme);
          }),

        // Panel actions
        setRightPanelVisible: (visible) =>
          set((state) => {
            state.rightPanelVisible = visible;
          }),

        setLeftPanelCollapsed: (collapsed) =>
          set((state) => {
            state.leftPanelCollapsed = collapsed;
          }),

        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.sidebarCollapsed = collapsed;
          }),

        // Modal actions
        setSettingsModalOpen: (open) =>
          set((state) => {
            state.settingsModalOpen = open;
          }),

        setConfirmDialogOpen: (open) =>
          set((state) => {
            state.confirmDialogOpen = open;
          }),

        setFilePreviewOpen: (open) =>
          set((state) => {
            state.filePreviewOpen = open;
          }),

        setHelpModalOpen: (open) =>
          set((state) => {
            state.helpModalOpen = open;
          }),

        // Global state actions
        setGlobalLoading: (loading) =>
          set((state) => {
            state.globalLoading = loading;
          }),

        setGlobalError: (error) =>
          set((state) => {
            state.globalError = error;
          }),

        // Notification actions
        addNotification: (notification) =>
          set((state) => {
            const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newNotification: Notification = {
              ...notification,
              id,
              timestamp: new Date().toISOString(),
              autoClose: notification.autoClose ?? true,
              duration: notification.duration ?? 5000,
            };
            
            state.notifications.push(newNotification);
            
            // Auto-remove notification if configured
            if (newNotification.autoClose) {
              setTimeout(() => {
                set((state) => {
                  state.notifications = state.notifications.filter(n => n.id !== id);
                });
              }, newNotification.duration);
            }
          }),

        removeNotification: (id) =>
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id);
          }),

        clearNotifications: () =>
          set((state) => {
            state.notifications = [];
          }),

        // Search actions
        setGlobalSearchOpen: (open) =>
          set((state) => {
            state.globalSearchOpen = open;
            if (!open) {
              state.globalSearchQuery = '';
            }
          }),

        setGlobalSearchQuery: (query) =>
          set((state) => {
            state.globalSearchQuery = query;
          }),

        // Reset actions
        resetUIState: () =>
          set((state) => {
            Object.assign(state, {
              ...initialState,
              settings: state.settings, // Keep settings
            });
          }),
      })),
      {
        name: 'biomni-ui-store',
        partialize: (state) => ({
          settings: state.settings,
          rightPanelVisible: state.rightPanelVisible,
          leftPanelCollapsed: state.leftPanelCollapsed,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    {
      name: 'biomni-ui-store',
    }
  )
);

// Theme application function
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  if (theme === 'system') {
    // Use system preference
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Initialize theme on store creation
const initializeTheme = () => {
  const state = useUIStore.getState();
  applyTheme(state.settings.theme);
  
  // Listen for system theme changes
  if (state.settings.theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (useUIStore.getState().settings.theme === 'system') {
        applyTheme('system');
      }
    });
  }
};

// Initialize theme when the module loads
initializeTheme();

// Selectors
export const useTheme = () => useUIStore((state) => state.settings.theme);
export const useSettings = () => useUIStore((state) => state.settings);
export const useRightPanelVisible = () => useUIStore((state) => state.rightPanelVisible);
export const useLeftPanelCollapsed = () => useUIStore((state) => state.leftPanelCollapsed);
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);
export const useGlobalError = () => useUIStore((state) => state.globalError);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useGlobalSearch = () => useUIStore((state) => ({
  isOpen: state.globalSearchOpen,
  query: state.globalSearchQuery,
}));

// Modal selectors
export const useModals = () => useUIStore((state) => ({
  settings: state.settingsModalOpen,
  confirmDialog: state.confirmDialogOpen,
  filePreview: state.filePreviewOpen,
  help: state.helpModalOpen,
}));

// Computed selectors
export const useIsDarkMode = () => {
  const theme = useTheme();
  
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  return theme === 'dark';
};

export const useEffectiveTheme = (): 'light' | 'dark' => {
  const theme = useTheme();
  
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  return theme;
};

// Action helpers
export const useNotificationActions = () => {
  const store = useUIStore();
  
  return {
    success: (title: string, message?: string) =>
      store.addNotification({ type: 'success', title, message }),
    
    error: (title: string, message?: string) =>
      store.addNotification({ type: 'error', title, message, autoClose: false }),
    
    warning: (title: string, message?: string) =>
      store.addNotification({ type: 'warning', title, message }),
    
    info: (title: string, message?: string) =>
      store.addNotification({ type: 'info', title, message }),
    
    remove: store.removeNotification,
    clear: store.clearNotifications,
  };
};

export const useUIActions = () => {
  const store = useUIStore();
  
  return {
    setTheme: store.setTheme,
    toggleTheme: store.toggleTheme,
    updateSettings: store.updateSettings,
    setRightPanelVisible: store.setRightPanelVisible,
    setLeftPanelCollapsed: store.setLeftPanelCollapsed,
    setSidebarCollapsed: store.setSidebarCollapsed,
    setGlobalLoading: store.setGlobalLoading,
    setGlobalError: store.setGlobalError,
  };
};

export default useUIStore;