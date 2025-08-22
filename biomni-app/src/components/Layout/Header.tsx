/**
 * Header Component
 * Top navigation bar with logo, session info, and controls
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  PanelRight,
  PanelRightClose,
  Wifi,
  WifiOff,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useTheme, useUIActions, useSidebarCollapsed } from '../../stores/uiStore';
import { useCreateSession } from '../../stores/sessionStore';
import { useIsStreaming } from '../../stores/chatStore';
import type { HeaderProps } from '../../types/components';

export const Header: React.FC<HeaderProps> = ({
  title,
  logo,
  actions,
  user,
  className,
}) => {
  const theme = useTheme();
  const { setTheme, setSettingsModalOpen, toggleSidebar } = useUIActions();
  const createSession = useCreateSession();
  const isStreaming = useIsStreaming();
  const sidebarCollapsed = useSidebarCollapsed();

  // Handle theme toggle
  const handleThemeToggle = () => {
    const themeOrder: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
  };

  // Get theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
    }
  };

  // Handle new session
  const handleNewSession = () => {
    const sessionId = createSession('New Chat');
    return sessionId;
  };

  return (
    <header className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm ${className || ''}`}>
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => toggleSidebar()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          {logo || (
            <div className="w-8 h-8 bg-biomni-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title || 'Biomni'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Biomedical AI Assistant
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        {isStreaming && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <motion.div
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Processing...
            </span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Custom Actions */}
        {actions}

        {/* New Session Button */}
        <button
          onClick={handleNewSession}
          className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-biomni-500 hover:bg-biomni-600 text-white rounded-lg transition-colors font-medium"
          disabled={isStreaming}
          title="Start new session"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={`Current theme: ${theme} (click to change)`}
        >
          {getThemeIcon()}
        </button>

        {/* Settings */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* User Info */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;