// AIDEV-NOTE: Conversation history list component for the sidebar
// Shows all saved conversations with preview and allows loading past conversations
// Updated to use Supabase for persistent storage

import React, { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  SavedConversation, 
  getSavedConversations as getFromSupabase, 
  deleteConversation as deleteFromSupabase 
} from '@/lib/supabaseStorage'
import { formatDistanceToNow } from 'date-fns'
import { errorTracker } from '@/lib/errorTracker'

interface ConversationHistoryProps {
  onSelectConversation: (conversation: SavedConversation) => void
  currentConversationId?: string
}

export function ConversationHistory({ onSelectConversation, currentConversationId }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<SavedConversation[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
    
    // Set up interval to refresh conversations every 30 seconds
    const intervalId = setInterval(loadConversations, 30000)
    
    return () => clearInterval(intervalId)
  }, [])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const saved = await getFromSupabase()
      setConversations(saved)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setError('Failed to load conversations')
      await errorTracker.logError('database', 'Failed to load conversations', {}, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation() // Prevent selecting the conversation
    if (window.confirm('Delete this conversation?')) {
      try {
        await deleteFromSupabase(conversationId)
        await loadConversations() // Reload after deletion
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        await errorTracker.logError('database', 'Failed to delete conversation', {
          conversationId
        }, error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 py-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-2 text-text-tertiary animate-spin" />
        <p className="text-sm text-text-tertiary">Loading conversations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-400">Failed to load conversations</p>
        <button 
          onClick={loadConversations}
          className="text-xs text-brand-400 mt-2 hover:underline"
        >
          Try again
        </button>
      </div>
    )
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