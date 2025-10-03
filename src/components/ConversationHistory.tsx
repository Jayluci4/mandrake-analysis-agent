// AIDEV-NOTE: Conversation History Modal Component
// Manages saved conversations with search, preview, and export capabilities

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Search, Clock, MessageSquare, Download, Trash2,
  ChevronRight, Calendar, Bot, User, FileJson,
  FileText, AlertCircle, CheckSquare, Square, Archive
} from 'lucide-react'
import Fuse from 'fuse.js'

interface Conversation {
  session_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  model_used: string
  messages?: any[]
  summary?: string
  // AIDEV-NOTE: Added for enhanced search
  firstMessage?: string
  lastMessage?: string
  messageContent?: string // Concatenated message content for search
}

interface ConversationHistoryProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  onLoadConversation: (sessionId: string) => void
  onDeleteConversation: (sessionId: string) => void
  onExportConversation: (sessionId: string, format: 'json' | 'markdown') => void
  currentSessionId?: string
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  isOpen,
  onClose,
  conversations,
  onLoadConversation,
  onDeleteConversation,
  onExportConversation,
  currentSessionId
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // AIDEV-NOTE: Enhanced conversations with searchable content
  const enhancedConversations = conversations.map(conv => {
    const firstMessage = conv.messages?.[0]?.content || ''
    const lastMessage = conv.messages?.[conv.messages.length - 1]?.content || ''
    const messageContent = conv.messages?.map(m => m.content).join(' ') || ''

    return {
      ...conv,
      firstMessage,
      lastMessage,
      messageContent: messageContent.slice(0, 1000), // Limit for performance
    }
  })

  // AIDEV-NOTE: Enhanced fuzzy search that searches conversation content
  const fuse = new Fuse(enhancedConversations, {
    keys: [
      { name: 'title', weight: 0.3 },
      { name: 'summary', weight: 0.2 },
      { name: 'firstMessage', weight: 0.2 },
      { name: 'lastMessage', weight: 0.1 },
      { name: 'messageContent', weight: 0.15 },
      { name: 'session_id', weight: 0.05 }
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    shouldSort: true
  })

  const filteredConversations = searchQuery
    ? fuse.search(searchQuery).map(result => ({
        ...result.item,
        searchScore: result.score,
        matches: result.matches
      }))
    : enhancedConversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  // Toggle conversation selection
  const toggleConversationSelection = (sessionId: string) => {
    const newSelection = new Set(selectedConversations)
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId)
    } else {
      newSelection.add(sessionId)
    }
    setSelectedConversations(newSelection)
  }

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set())
    } else {
      setSelectedConversations(new Set(filteredConversations.map(c => c.session_id)))
    }
  }

  // Delete selected conversations
  const deleteSelected = () => {
    selectedConversations.forEach(sessionId => {
      onDeleteConversation(sessionId)
    })
    setSelectedConversations(new Set())
    setShowDeleteConfirm(false)
  }

  // Export selected conversations
  const exportSelected = (format: 'json' | 'markdown') => {
    selectedConversations.forEach(sessionId => {
      onExportConversation(sessionId, format)
    })
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid date'

    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`
    if (diffHours < 48) return 'Yesterday'
    if (diffHours < 168) return `${Math.floor(diffHours / 24)} days ago`

    return date.toLocaleDateString()
  }

  // Get model icon
  const getModelIcon = (model: string) => {
    if (model?.includes('GPT')) return '🤖'
    if (model?.includes('Claude') || model?.includes('Sonnet')) return '🧠'
    return '💬'
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
          e.preventDefault()
          toggleSelectAll()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl h-[75vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Clock className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">Conversation History</h2>
                <span className="text-[15.5px] text-gray-400">
                  {conversations.length} conversations • {selectedConversations.size} selected
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Bulk Actions */}
                {selectedConversations.size > 0 && (
                  <>
                    <button
                      onClick={() => exportSelected('json')}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                    >
                      <FileJson className="w-4 h-4" />
                      <span className="text-[15.5px]">Export JSON</span>
                    </button>

                    <button
                      onClick={() => exportSelected('markdown')}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-[15.5px]">Export MD</span>
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[15.5px]">Delete ({selectedConversations.size})</span>
                    </button>
                  </>
                )}

                {/* Select All */}
                <button
                  onClick={toggleSelectAll}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={selectedConversations.size === filteredConversations.length ? "Deselect all" : "Select all"}
                >
                  {selectedConversations.size === filteredConversations.length ?
                    <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* Enhanced Search with recommendations */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by content, title, or messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[15.5px] text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 w-80"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Search Results Header */}
            {searchQuery && filteredConversations.length > 0 && (
              <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-[14px] text-cyan-400">
                  Found <span className="font-semibold">{filteredConversations.length}</span> conversation{filteredConversations.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </p>
                <p className="text-[12px] text-gray-400 mt-1">
                  Results sorted by relevance • Best matches shown first
                </p>
              </div>
            )}

            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Archive className="w-12 h-12 mb-3" />
                <p className="text-[15.5px]">No conversations found</p>
                {searchQuery && (
                  <p className="text-[13.5px] mt-2">Try adjusting your search</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map(conv => (
                  <motion.div
                    key={conv.session_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`bg-white/5 border ${
                      currentSessionId === conv.session_id ? 'border-cyan-500 bg-cyan-500/10' :
                      selectedConversations.has(conv.session_id) ? 'border-blue-500 bg-blue-500/10' :
                      'border-white/10'
                    } rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer group`}
                    onClick={() => onLoadConversation(conv.session_id)}
                    onMouseEnter={() => setHoveredConversation(conv.session_id)}
                    onMouseLeave={() => setHoveredConversation(null)}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedConversations.has(conv.session_id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleConversationSelection(conv.session_id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 flex-shrink-0"
                      />

                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-[17px] font-medium text-white truncate">
                                {conv.title}
                              </h3>
                              {/* AIDEV-NOTE: Show search relevance score */}
                              {searchQuery && (conv as any).searchScore !== undefined && (
                                <span className={`px-2 py-0.5 text-[11px] rounded-full ${
                                  (conv as any).searchScore < 0.2 ? 'bg-green-500/20 text-green-400' :
                                  (conv as any).searchScore < 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {(conv as any).searchScore < 0.2 ? '⭐ Best Match' :
                                   (conv as any).searchScore < 0.4 ? '✓ Good Match' :
                                   'Partial Match'}
                                </span>
                              )}
                            </div>
                            {currentSessionId === conv.session_id && (
                              <span className="inline-block px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[11.5px] rounded mt-1">
                                Current Session
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Summary Preview or Match Preview */}
                        {searchQuery && (conv as any).matches && (conv as any).matches.length > 0 ? (
                          <div className="text-[13.5px] text-gray-300 mb-2 bg-white/5 rounded p-2">
                            <span className="text-cyan-400 text-[11px] uppercase tracking-wider">Match found in: </span>
                            {(conv as any).matches[0].key === 'messageContent' ? 'conversation messages' :
                             (conv as any).matches[0].key === 'firstMessage' ? 'first message' :
                             (conv as any).matches[0].key === 'lastMessage' ? 'last message' :
                             (conv as any).matches[0].key}
                            {conv.firstMessage && (
                              <p className="mt-1 text-gray-400 line-clamp-2 italic">
                                "{conv.firstMessage.slice(0, 150)}..."
                              </p>
                            )}
                          </div>
                        ) : conv.summary && hoveredConversation === conv.session_id ? (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-[13.5px] text-gray-400 mb-2 line-clamp-2"
                          >
                            {conv.summary}
                          </motion.p>
                        ) : null}

                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-[13.5px] text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(conv.updated_at)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{conv.message_count} messages</span>
                          </div>
                          {conv.model_used && (
                            <div className="flex items-center space-x-1">
                              <Bot className="w-3 h-3" />
                              <span>{conv.model_used}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onExportConversation(conv.session_id, 'json')
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Export JSON"
                        >
                          <FileJson className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onExportConversation(conv.session_id, 'markdown')
                          }}
                          className="p-1.5 text-gray-400 hover:text-green-400 transition-colors"
                          title="Export Markdown"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteConversation(conv.session_id)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Confirm Delete</h3>
                      <p className="text-[15.5px] text-gray-300 mb-4">
                        Are you sure you want to delete {selectedConversations.size} conversation{selectedConversations.size > 1 ? 's' : ''}? This action cannot be undone.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={deleteSelected}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ConversationHistory