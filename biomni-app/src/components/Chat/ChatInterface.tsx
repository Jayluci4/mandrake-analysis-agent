/**
 * Chat Interface Component
 * Main chat UI with message list and input panel
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageList } from './MessageList';
import { InputPanel } from './InputPanel';
import { FileUploadZone } from '../File/FileUploadZone';
import { useSettings } from '../../stores/uiStore';
import type { ChatInterfaceProps } from '../../types/components';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  className,
}) => {
  const settings = useSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (settings.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isStreaming, settings.autoScroll]);

  // Handle file upload
  const handleFilesUploaded = (files: any[]) => {
    // Files are automatically added to the store by the upload hook
    console.log('Files uploaded:', files);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className || ''}`}>
      {/* Chat Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          // Welcome Screen
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-md"
            >
              <div className="w-16 h-16 bg-biomni-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-2xl">B</span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Welcome to Biomni
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                Your AI-powered biomedical research assistant. Upload files, ask questions, 
                and get detailed analysis with real-time insights.
              </p>

              <div className="space-y-4">
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Try asking:
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• "Analyze this protein sequence and predict its structure"</li>
                    <li>• "What are the latest treatments for cancer?"</li>
                    <li>• "Design CRISPR guide RNAs for the BRCA1 gene"</li>
                    <li>• "Explain the mechanism of action of this drug"</li>
                  </ul>
                </div>

                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Supported file formats:
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    FASTA, FASTQ, VCF, CSV, JSON, PDF, and more
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Message List
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-4">
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
              />
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* File Upload Zone (when no files are selected) */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto p-4">
          <FileUploadZone
            onFilesUploaded={handleFilesUploaded}
            maxFiles={5}
            className="mb-4"
          />
        </div>
      </div>

      {/* Input Panel */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto p-4">
          <InputPanel
            onSendMessage={onSendMessage}
            disabled={isStreaming}
            placeholder="Ask me anything about biomedical research..."
          />
          
          {isStreaming && onStopStreaming && (
            <div className="flex justify-center mt-3">
              <button
                onClick={onStopStreaming}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors text-sm font-medium"
              >
                Stop Generation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;