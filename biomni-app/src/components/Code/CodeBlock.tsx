/**
 * Code Block Component
 * Syntax-highlighted code display with copy and collapse functionality
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Code,
  Terminal,
  Download
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffectiveTheme } from '../../stores/uiStore';
import type { CodeBlockProps } from '../../types/components';

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  showLineNumbers = true,
  title,
  copyable = true,
  collapsible = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const effectiveTheme = useEffectiveTheme();

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Handle download
  const handleDownload = () => {
    const extension = getFileExtension(language);
    const filename = title ? `${title}.${extension}` : `code.${extension}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get file extension based on language
  const getFileExtension = (lang: string) => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      sql: 'sql',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yml',
      xml: 'xml',
      markdown: 'md',
      bash: 'sh',
      shell: 'sh',
      powershell: 'ps1',
      r: 'r',
      matlab: 'm',
    };
    return extensions[lang.toLowerCase()] || 'txt';
  };

  // Get language display name
  const getLanguageDisplayName = (lang: string) => {
    const names: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      swift: 'Swift',
      kotlin: 'Kotlin',
      scala: 'Scala',
      sql: 'SQL',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      yaml: 'YAML',
      xml: 'XML',
      markdown: 'Markdown',
      bash: 'Bash',
      shell: 'Shell',
      powershell: 'PowerShell',
      r: 'R',
      matlab: 'MATLAB',
    };
    return names[lang.toLowerCase()] || lang.toUpperCase();
  };

  // Get language icon
  const getLanguageIcon = (lang: string) => {
    if (['bash', 'shell', 'powershell'].includes(lang.toLowerCase())) {
      return <Terminal className="w-4 h-4" />;
    }
    return <Code className="w-4 h-4" />;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-3">
          {/* Collapse Toggle */}
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isCollapsed ? 'Expand code' : 'Collapse code'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}

          {/* Language Icon and Name */}
          <div className="flex items-center space-x-2">
            <div className="text-gray-600 dark:text-gray-400">
              {getLanguageIcon(language)}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {title || getLanguageDisplayName(language)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Copy Button */}
          {copyable && (
            <button
              onClick={handleCopy}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download code"
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Code Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              <SyntaxHighlighter
                language={language}
                style={effectiveTheme === 'dark' ? oneDark : oneLight}
                showLineNumbers={showLineNumbers}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }
                }}
                lineNumberStyle={{
                  minWidth: '3em',
                  paddingRight: '1em',
                  color: effectiveTheme === 'dark' ? '#6B7280' : '#9CA3AF',
                  backgroundColor: 'transparent',
                  borderRight: `1px solid ${effectiveTheme === 'dark' ? '#374151' : '#E5E7EB'}`,
                  marginRight: '1em',
                }}
              >
                {code}
              </SyntaxHighlighter>

              {/* Copy overlay on hover */}
              {copyable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 bg-gray-800 dark:bg-gray-700 text-white rounded shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State Info */}
      {isCollapsed && (
        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
          {code.split('\n').length} lines of {getLanguageDisplayName(language)} code
          {copyable && (
            <button
              onClick={handleCopy}
              className="ml-2 text-biomni-500 hover:text-biomni-600 transition-colors"
            >
              (copy)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeBlock;