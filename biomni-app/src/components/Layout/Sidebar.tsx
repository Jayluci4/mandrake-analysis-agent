/**
 * Sidebar Component
 * Session management and navigation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit3,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock
} from 'lucide-react';
import { useSidebarCollapsed, useUIActions } from '../../stores/uiStore';
import { useSessionActions } from '../../stores/sessionStore';
import type { SessionSummary } from '../../types/api';

interface SidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
}) => {
  const collapsed = useSidebarCollapsed();
  const { setSidebarCollapsed } = useUIActions();
  const { setCurrentSession, createNewSession, removeSession } = useSessionActions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => {
    const query = searchQuery.toLowerCase();
    // You could add title searching here when sessions have titles
    return session.id.toLowerCase().includes(query);
  });

  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    setCurrentSession(sessionId);
  };

  // Handle session deletion
  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this session?')) {
      removeSession(sessionId);
    }
  };

  // Handle new session
  const handleNewSession = () => {
    createNewSession();
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!collapsed);
  };

  // Format session time
  const formatSessionTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Generate session title from ID (placeholder)
  const getSessionTitle = (session: SessionSummary) => {
    // In a real app, you'd have actual titles
    return `Session ${session.id.slice(-8)}`;
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 60 : 280 }}
      transition={{ duration: 0.2 }}
      className="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Sessions
            </motion.h2>
          )}
          
          <div className="flex items-center space-x-2">
            {/* New Session Button */}
            <button
              onClick={handleNewSession}
              className="p-2 rounded-lg bg-biomni-500 hover:bg-biomni-600 text-white transition-colors"
              title="New session"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-biomni-500 focus:border-transparent"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {collapsed ? (
          // Collapsed view - just icons
          <div className="p-2 space-y-2">
            {filteredSessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`w-full p-3 rounded-lg transition-colors ${
                  session.id === activeSessionId
                    ? 'bg-biomni-100 dark:bg-biomni-900/30 text-biomni-700 dark:text-biomni-300'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title={getSessionTitle(session)}
              >
                <MessageSquare className="w-5 h-5 mx-auto" />
              </button>
            ))}
          </div>
        ) : (
          // Expanded view - full session cards
          <div className="p-2 space-y-2">
            <AnimatePresence>
              {filteredSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredSession(session.id)}
                  onMouseLeave={() => setHoveredSession(null)}
                  className={`relative group cursor-pointer rounded-lg transition-all ${
                    session.id === activeSessionId
                      ? 'bg-biomni-100 dark:bg-biomni-900/30 border border-biomni-200 dark:border-biomni-700'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {getSessionTitle(session)}
                          </h3>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatSessionTime(session.last_activity)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{session.query_count} queries</span>
                          </div>
                        </div>
                      </div>

                      {/* Session Actions */}
                      <AnimatePresence>
                        {hoveredSession === session.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center space-x-1"
                          >
                            <button
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty State */}
            {filteredSessions.length === 0 && (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? 'No sessions match your search' : 'No sessions yet'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleNewSession}
                    className="px-4 py-2 bg-biomni-500 hover:bg-biomni-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Start your first session
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Sidebar;