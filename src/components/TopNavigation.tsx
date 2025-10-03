// AIDEV-NOTE: Top Navigation Bar Component for Biomni
// Provides primary actions and model selection in a clean, accessible interface

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, History, FileText, ChevronDown, Wifi, WifiOff,
  Brain, Sparkles, Clock, Search
} from 'lucide-react'
import { GoogleLogin } from './GoogleLogin'

interface TopNavigationProps {
  onNewConversation: () => void
  onOpenHistory: () => void
  onOpenFileManager: () => void
  onExportConversation?: () => void
  onClearConversation?: () => void
  selectedModel: string
  onModelChange: (model: string) => void
  connectionStatus: 'detecting' | 'ready' | 'connected' | 'error'
  activeModel?: string
  isProcessing?: boolean
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  onNewConversation,
  onOpenHistory,
  onOpenFileManager,
  onExportConversation,
  onClearConversation,
  selectedModel,
  onModelChange,
  connectionStatus,
  activeModel,
  isProcessing
}) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  const models = [
    { value: 'GPT4.1', label: 'GPT-4', icon: '🤖' },
    { value: 'Sonnet-4', label: 'Claude Sonnet 4', icon: '🧠' }
  ]

  return (
    <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-3 relative z-20">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {(isProcessing || connectionStatus === 'connected') && (
                <div className="absolute inset-0 bg-cyan-400/30 blur-xl rounded-full animate-pulse" />
              )}
              <img
                src="/assets/Screenshot_2025-09-15_104043-removebg-preview.png"
                alt="Mandrake Logo"
                className="w-10 h-10 object-contain relative z-10"
              />
            </div>
            <div>
              <h1 className="text-lg font-medium text-white">
                Mandrake Analysis Agent
              </h1>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center space-x-2 ml-8">
            {/* New Conversation Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNewConversation}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4 text-green-400" />
              <span className="text-[15.5px] text-green-400 font-medium">New Conversation</span>
            </motion.button>

            {/* History Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenHistory}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span className="text-[15.5px] text-gray-300 font-medium">History</span>
            </motion.button>


            {/* Model Selection Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all min-w-[160px]"
              >
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-[15.5px] text-gray-300 font-medium">
                  {models.find(m => m.value === selectedModel)?.label || 'Select Model'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 left-0 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl overflow-hidden"
                  >
                    {models.map((model) => (
                      <button
                        key={model.value}
                        onClick={() => {
                          onModelChange(model.value)
                          setShowModelDropdown(false)
                        }}
                        className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-white/10 transition-colors text-left ${
                          selectedModel === model.value ? 'bg-cyan-500/20' : ''
                        }`}
                      >
                        <span className="text-lg">{model.icon}</span>
                        <div className="flex-1">
                          <div className="text-[15.5px] text-white">{model.label}</div>
                          {selectedModel === model.value && activeModel && (
                            <div className="text-[13.5px] text-green-400">Active</div>
                          )}
                        </div>
                        {selectedModel === model.value && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manage Files Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenFileManager}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-[15.5px] text-gray-300 font-medium">Manage Files</span>
            </motion.button>
          </div>
        </div>

        {/* Right Section - Connection Status and Google Login */}
        <div className="flex items-center space-x-4">
          {/* Google Login Button */}
          <GoogleLogin />

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-[13.5px] text-green-400">Connected</span>
              </>
            ) : connectionStatus === 'ready' ? (
              <>
                <Wifi className="w-4 h-4 text-cyan-400" />
                <span className="text-[13.5px] text-cyan-400">Ready</span>
              </>
            ) : connectionStatus === 'detecting' ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </motion.div>
                <span className="text-[13.5px] text-yellow-400">Detecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-[13.5px] text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showModelDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowModelDropdown(false)}
        />
      )}
    </div>
  )
}

export default TopNavigation