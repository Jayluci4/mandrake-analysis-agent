/**
 * Message List Component
 * Displays chat messages with proper formatting and animations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import type { MessageListProps } from '../../types/components';

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  className,
}) => {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3,
              delay: index * 0.1,
              ease: "easeOut"
            }}
            layout
          >
            <MessageBubble
              message={message}
              isLatest={index === messages.length - 1}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing Indicator for streaming */}
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-start space-x-4"
        >
          <div className="w-8 h-8 bg-biomni-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium text-sm">B</span>
          </div>
          
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 max-w-3xl">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <motion.div
                    className="w-2 h-2 bg-biomni-500 rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-biomni-500 rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-biomni-500 rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Analyzing...
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MessageList;