/**
 * Main Layout Component
 * Implements the two-panel design with chat interface and execution details
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { 
  useRightPanelVisible, 
  useSettings, 
  useUIActions,
  useEffectiveTheme 
} from '../../stores/uiStore';
import { useSessions, useCurrentSessionId } from '../../stores/sessionStore';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatInterface } from '../Chat/ChatInterface';
import { StreamingDisplay } from '../Chat/StreamingDisplay';
import { useMessages, useStreamingEvents, useIsStreaming } from '../../stores/chatStore';
import useStreamingQuery from '../../hooks/useStreamingQuery';

interface MainLayoutProps {
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ className }) => {
  const rightPanelVisible = useRightPanelVisible();
  const settings = useSettings();
  const { setRightPanelVisible } = useUIActions();
  const effectiveTheme = useEffectiveTheme();
  
  // Chat state
  const messages = useMessages();
  const streamingEvents = useStreamingEvents();
  const isStreaming = useIsStreaming();
  
  // Session state
  const sessions = useSessions();
  const currentSessionId = useCurrentSessionId();
  
  // Streaming functionality
  const { startStream, stopStream, connectionState } = useStreamingQuery();

  // Handle sending messages
  const handleSendMessage = async (message: string, files?: File[]) => {
    try {
      // TODO: Handle file uploads first if present
      const fileIds: string[] = [];
      
      if (files && files.length > 0) {
        // Upload files and get IDs
        // This will be implemented when we create the file upload component
      }

      // Start streaming query
      await startStream({
        prompt: message,
        model: 'azure-gpt-4.1', // Fixed model as per requirements
        session_id: currentSessionId || undefined,
        file_ids: fileIds.length > 0 ? fileIds : undefined,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle stopping streaming
  const handleStopStreaming = () => {
    stopStream();
  };

  // Toggle right panel
  const toggleRightPanel = () => {
    setRightPanelVisible(!rightPanelVisible);
  };

  // Apply theme class to body
  useEffect(() => {
    document.body.className = effectiveTheme === 'dark' ? 'dark' : '';
  }, [effectiveTheme]);

  return (
    <div className={`h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 ${className || ''}`}>
      {/* Header */}
      <Header 
        currentSessionId={currentSessionId}
        isStreaming={isStreaming}
        connectionState={connectionState}
        onToggleRightPanel={toggleRightPanel}
        rightPanelVisible={rightPanelVisible}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          sessions={sessions}
          activeSessionId={currentSessionId}
        />

        {/* Main Panel Group */}
        <div className="flex-1 flex">
          <PanelGroup direction="horizontal" className="flex-1">
            {/* Left Panel - Chat Interface */}
            <Panel 
              defaultSize={rightPanelVisible ? 60 : 100}
              minSize={30}
              className="flex flex-col"
            >
              <motion.div 
                className="flex-1 flex flex-col"
                layout
                transition={{ duration: 0.2 }}
              >
                <ChatInterface
                  messages={messages}
                  isStreaming={isStreaming}
                  onSendMessage={handleSendMessage}
                  onStopStreaming={handleStopStreaming}
                />
              </motion.div>
            </Panel>

            {/* Resize Handle */}
            <AnimatePresence>
              {rightPanelVisible && (
                <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-biomni-500 transition-colors duration-200 cursor-col-resize" />
              )}
            </AnimatePresence>

            {/* Right Panel - Execution Details */}
            <AnimatePresence>
              {rightPanelVisible && (
                <Panel 
                  defaultSize={40}
                  minSize={20}
                  className="flex flex-col"
                >
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700"
                  >
                    {/* Right Panel Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Execution Details
                      </h2>
                      <button
                        onClick={toggleRightPanel}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Close panel"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Streaming Display */}
                    <div className="flex-1 overflow-hidden">
                      <StreamingDisplay
                        events={streamingEvents}
                        isStreaming={isStreaming}
                      />
                    </div>
                  </motion.div>
                </Panel>
              )}
            </AnimatePresence>
          </PanelGroup>
        </div>
      </div>

      {/* Status Bar */}
      {(isStreaming || connectionState !== 'disconnected') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-biomni-50 dark:bg-biomni-900/20 border-t border-biomni-200 dark:border-biomni-700 px-4 py-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isStreaming && (
                <>
                  <div className="w-2 h-2 bg-biomni-500 rounded-full animate-pulse" />
                  <span className="text-sm text-biomni-700 dark:text-biomni-300">
                    Analyzing your query...
                  </span>
                </>
              )}
              
              {connectionState === 'reconnecting' && (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Reconnecting...
                  </span>
                </>
              )}
              
              {connectionState === 'error' && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm text-red-700 dark:text-red-300">
                    Connection error
                  </span>
                </>
              )}
            </div>

            {isStreaming && (
              <button
                onClick={handleStopStreaming}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MainLayout;