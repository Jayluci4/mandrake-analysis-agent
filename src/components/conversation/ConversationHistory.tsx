// AIDEV-NOTE: Conversation history list component for the sidebar
// Shows all saved conversations with preview and allows loading past conversations

import React, { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SavedConversation, getSavedConversations, deleteConversation } from '@/lib/conversationStorage'
import { formatDistanceToNow } from 'date-fns'

interface ConversationHistoryProps {
  onSelectConversation: (conversation: SavedConversation) => void
  currentConversationId?: string
}

export function ConversationHistory({ onSelectConversation, currentConversationId }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<SavedConversation[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Load conversations on mount and set up storage event listener
  useEffect(() => {
    loadConversations()

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bioagent_conversations') {
        loadConversations()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const loadConversations = () => {
    const saved = getSavedConversations()
    setConversations(saved)
  }

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation() // Prevent selecting the conversation
    if (window.confirm('Delete this conversation?')) {
      deleteConversation(conversationId)
      loadConversations()
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
        <p className="text-sm text-text-tertiary">No conversations yet</p>
        <p className="text-xs text-text-tertiary mt-1">Start a new research to begin</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="px-4 py-2">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Recent Conversations
        </h3>
      </div>
      
      <div className="space-y-0.5 max-h-96 overflow-y-auto custom-scrollbar">
        {conversations.map((conversation) => (
          <div
            key={conversation.metadata.id}
            onClick={() => onSelectConversation(conversation)}
            onMouseEnter={() => setHoveredId(conversation.metadata.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              "group px-4 py-3 cursor-pointer transition-all duration-200 relative",
              currentConversationId === conversation.metadata.id
                ? "bg-brand-500/10 border-l-2 border-brand-400"
                : "hover:bg-white/[0.02] border-l-2 border-transparent"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-sm font-medium truncate",
                  currentConversationId === conversation.metadata.id
                    ? "text-brand-400"
                    : "text-text-primary"
                )}>
                  {conversation.metadata.title}
                </h4>
                <p className="text-xs text-text-tertiary truncate mt-0.5">
                  {conversation.metadata.lastMessage}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary">
                    {formatDistanceToNow(conversation.metadata.timestamp, { addSuffix: true })}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    • {conversation.metadata.messageCount} messages
                  </span>
                </div>
              </div>
              
              {/* Delete button - only show on hover */}
              {hoveredId === conversation.metadata.id && (
                <button
                  onClick={(e) => handleDelete(e, conversation.metadata.id)}
                  className="p-1 rounded hover:bg-red-500/10 transition-colors"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-red-400" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}