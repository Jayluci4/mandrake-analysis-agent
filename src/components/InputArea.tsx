import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Send, Upload, FileText, X, Dna
} from 'lucide-react'

interface InputAreaProps {
  input: string
  setInput: (value: string) => void
  onSendMessage: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isProcessing: boolean
  connectionStatus: 'detecting' | 'ready' | 'connected' | 'error'
  selectedModel: 'GPT4.1' | 'Sonnet-4'
  onModelChange: (model: 'GPT4.1' | 'Sonnet-4') => void
  activeModel: string | null
  uploadedFiles: { name: string; id: string }[]
  onRemoveFile: (fileId: string) => void
  isUploading: boolean
  uploadProgress: number
  onStopProcessing: () => void
}

const InputArea: React.FC<InputAreaProps> = ({
  input,
  setInput,
  onSendMessage,
  onFileUpload,
  isProcessing,
  connectionStatus,
  selectedModel,
  onModelChange,
  activeModel,
  uploadedFiles,
  onRemoveFile,
  isUploading,
  uploadProgress,
  onStopProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  return (
    <div className="border-t border-white/10 p-4 bg-white/5 backdrop-blur-xl">
      <div className="flex items-center space-x-3">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".csv,.json,.txt,.fasta,.md,.png,.jpg,.jpeg"
          onChange={onFileUpload}
        />
        
        {/* Upload Button */}
        <div className="relative">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`p-2 transition-colors ${
              isUploading 
                ? 'text-cyan-400 bg-cyan-500/20' 
                : 'text-gray-400 hover:text-cyan-400 hover:bg-white/10'
            } rounded`}
            title={isUploading ? 'Uploading...' : 'Upload files'}
            aria-label="Upload files"
          >
            {isUploading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <Upload className="w-5 h-5" />
              </motion.div>
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </button>
          
          {/* Progress circle overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 12}`}
                  strokeDashoffset={`${2 * Math.PI * 12 * (1 - uploadProgress / 100)}`}
                  className="text-cyan-400 transition-all duration-300"
                />
              </svg>
            </div>
          )}
          
          {/* Progress text */}
          {isUploading && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
              <span className="text-xs text-cyan-400 bg-gray-900/80 px-2 py-1 rounded">
                {Math.round(uploadProgress)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Model Selector */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value as 'GPT4.1' | 'Sonnet-4')}
              className={`px-3 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white backdrop-blur-sm text-sm transition-all ${
                selectedModel === 'Sonnet-4' ? 'border-purple-500/30 bg-purple-500/10' : 'border-blue-500/30 bg-blue-500/10'
              }`}
              disabled={isProcessing}
              aria-label="Select AI model"
            >
              <option value="GPT4.1" className="bg-gray-900 text-white">GPT 4</option>
              <option value="Sonnet-4" className="bg-gray-900 text-white">Claude Sonnet 4</option>
            </select>
          </div>
          
          {/* Active model display */}
          {activeModel && isProcessing && (
            <div className="flex items-center space-x-1 text-xs">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                activeModel === 'Sonnet-4' ? 'bg-purple-400' : 'bg-blue-400'
              }`} />
              <span className={`${
                activeModel === 'Sonnet-4' ? 'text-purple-400' : 'text-blue-400'
              }`}>
                {activeModel === 'GPT4.1' ? 'GPT 4' : 'Claude Sonnet 4'}
              </span>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="flex-1">
          {/* Uploaded files tags */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center space-x-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded px-2 py-1 text-xs"
                >
                  <FileText className="w-3 h-3" />
                  <span className="max-w-20 truncate">{file.name}</span>
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="hover:text-red-400 transition-colors"
                    title="Remove file"
                    aria-label={`Remove file ${file.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask any biomedical questions..."
            className="w-full px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm resize-none placeholder-gray-500"
            disabled={isProcessing || connectionStatus !== 'ready'}
            rows={Math.min(5, Math.max(1, input.split('\n').length))}
            style={{ minHeight: '28px', maxHeight: '120px' }}
            aria-label="Message input"
          />
        </div>
        
        {/* Send/Stop Button */}
        {isProcessing ? (
          <button
            onClick={onStopProcessing}
            className="p-2 bg-red-500/80 backdrop-blur-sm text-white rounded-md hover:bg-red-600/80 transition-colors"
            title="Stop processing"
            aria-label="Stop processing"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onSendMessage}
            className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-md hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
            disabled={!input.trim() || connectionStatus !== 'ready'}
            title="Send to Mandrake"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default InputArea
