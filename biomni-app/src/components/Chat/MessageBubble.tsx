/**
 * Message Bubble Component
 * Individual message display with markdown support and file attachments
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bot, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown,
  MoreVertical,
  FileText,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffectiveTheme } from '../../stores/uiStore';
import type { MessageBubbleProps } from '../../types/components';

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLatest,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const effectiveTheme = useEffectiveTheme();

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Custom markdown components
  const markdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';

      return !inline ? (
        <div className="my-4">
          <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
            {language}
          </div>
          <SyntaxHighlighter
            style={effectiveTheme === 'dark' ? oneDark : oneLight}
            language={language}
            PreTag="div"
            className="rounded-t-none rounded-b-lg !mt-0"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-biomni-500 pl-4 py-2 bg-biomni-50 dark:bg-biomni-900/20 rounded-r-lg my-4">
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {children}
      </td>
    ),
  };

  return (
    <motion.div
      className={`flex items-start space-x-4 group ${className || ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      whileHover={{ scale: 1.001 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.type === 'user' ? (
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-biomni-500 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {message.type === 'user' ? 'You' : 'Biomni'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.timestamp)}
          </span>
          {message.metadata?.model && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {message.metadata.model}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 max-w-3xl ${
            message.type === 'user'
              ? 'bg-biomni-500 text-white ml-auto'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {/* File Attachments */}
          {message.files && message.files.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                    {file.original_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  {file.download_url && (
                    <a
                      href={file.download_url}
                      download={file.original_name}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <Download className="w-3 h-3 text-gray-500" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message Text */}
          <div className={`prose prose-sm max-w-none ${
            message.type === 'user' 
              ? 'prose-invert' 
              : 'prose-gray dark:prose-invert'
          }`}>
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Metadata */}
          {message.metadata && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-4">
              {message.metadata.tokens && (
                <span>{message.metadata.tokens} tokens</span>
              )}
              {message.metadata.execution_time && (
                <span>{message.metadata.execution_time}ms</span>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: showActions ? 1 : 0, scale: showActions ? 1 : 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex items-center space-x-2 mt-2"
        >
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Copy message"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Feedback Buttons (for assistant messages) */}
          {message.type === 'assistant' && (
            <>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Good response"
              >
                <ThumbsUp className="w-4 h-4 text-gray-500" />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Poor response"
              >
                <ThumbsDown className="w-4 h-4 text-gray-500" />
              </button>
            </>
          )}

          {/* More Actions */}
          <button
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="More actions"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;