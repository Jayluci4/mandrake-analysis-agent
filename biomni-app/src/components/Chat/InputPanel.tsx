/**
 * Input Panel Component
 * Text input with file upload and send functionality
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Square,
  Loader2,
  X,
  FileText
} from 'lucide-react';
import { useUploadedFiles } from '../../stores/chatStore';
import useFileUpload from '../../hooks/useFileUpload';
import type { InputPanelProps } from '../../types/components';

export const InputPanel: React.FC<InputPanelProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  maxFiles = 5,
  accept,
  className,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadedFiles = useUploadedFiles();
  const { uploadFiles, uploading, uploadProgress } = useFileUpload();

  // Handle textarea auto-resize
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle send message
  const handleSend = async () => {
    if (!message.trim() || disabled || uploading) return;

    try {
      // Get file references from uploaded files
      const fileIds = uploadedFiles.map(file => file.id);
      
      // Call onSendMessage with message and file IDs
      await onSendMessage(message.trim());
      
      // Clear input
      setMessage('');
      adjustTextareaHeight();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      await uploadFiles(files);
    } catch (error) {
      console.error('File upload failed:', error);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle voice recording (placeholder)
  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording functionality
  };

  // Get upload progress
  const getUploadProgress = () => {
    const progresses = Object.values(uploadProgress);
    if (progresses.length === 0) return 0;
    return progresses.reduce((sum, p) => sum + p.progress, 0) / progresses.length;
  };

  // Check if ready to send
  const canSend = message.trim() && !disabled && !uploading;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className || ''}`}>
      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center space-x-2 bg-biomni-50 dark:bg-biomni-900/20 text-biomni-700 dark:text-biomni-300 px-3 py-2 rounded-lg text-sm"
              >
                <FileText className="w-4 h-4" />
                <span className="truncate max-w-40">{file.original_name}</span>
                <span className="text-xs opacity-75">
                  {(file.size / (1024 * 1024)).toFixed(1)}MB
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-4 h-4 animate-spin text-biomni-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Uploading files...</span>
                <span className="text-gray-500">{Math.round(getUploadProgress())}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <motion.div
                  className="bg-biomni-500 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${getUploadProgress()}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* File Upload Button */}
          <button
            onClick={handleFileSelect}
            disabled={disabled || uploading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload files"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
          </div>

          {/* Voice Recording Button */}
          <button
            onClick={handleVoiceToggle}
            disabled={disabled}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title={isRecording ? "Stop recording" : "Start voice recording"}
          >
            {isRecording ? (
              <Square className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              canSend
                ? 'bg-biomni-500 hover:bg-biomni-600 text-white shadow-sm hover:shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}
            title="Send message"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Character Count / Helper Text */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            {uploadedFiles.length > 0 && (
              <span>{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} attached</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span>{message.length} characters</span>
            {!disabled && (
              <span className="opacity-75">
                Press Enter to send, Shift+Enter for new line
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;