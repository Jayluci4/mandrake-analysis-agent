// AIDEV-NOTE: Supabase-based storage for conversations and usage metrics
// Replaces localStorage with persistent database storage with retry logic and fallback

import { supabase } from './supabase'
import { Message } from '@/components/conversation/ConversationInterface'
import { sessionManager } from './sessionManager'
import { errorTracker } from './errorTracker'
import * as localStorageFallback from './conversationStorage'

export interface ConversationMetadata {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messageCount: number
  agentType?: 'analysis' | 'research'
  model?: string
  sessionId?: string
}

export interface SavedConversation {
  metadata: ConversationMetadata
  messages: Message[]
}

export interface UsageMetrics {
  totalMessages: number
  messagesThisMonth: number
  messagesToday: number
  lastActiveAt: Date
  favoriteModel?: string
  totalConversations: number
}

// Generate a conversation title from the first user message
export function generateTitle(firstMessage: string): string {
  const maxLength = 50
  const cleaned = firstMessage.trim().replace(/\n+/g, ' ')
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}

// Get all saved conversations from Supabase for the current user
export async function getSavedConversations(): Promise<SavedConversation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at,
          metadata
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading conversations:', error)
      return []
    }

    // Transform the data to match our interface
    return (conversations || []).map(conv => ({
      metadata: {
        id: conv.id,
        title: conv.title,
        lastMessage: conv.summary || '',
        timestamp: new Date(conv.updated_at),
        messageCount: conv.messages?.length || 0,
        agentType: conv.agent_type,
        model: conv.model
      },
      messages: (conv.messages || []).map((msg: any) => ({
        type: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        model: msg.metadata?.model
      }))
    }))
  } catch (error) {
    console.error('Error in getSavedConversations:', error)
    return []
  }
}

// Save a conversation to Supabase with retry logic
export async function saveConversation(conversation: SavedConversation): Promise<void> {
  const MAX_RETRIES = 3
  let attempt = 0

  // Add session ID if available
  if (!conversation.metadata.sessionId) {
    conversation.metadata.sessionId = sessionManager.getCurrentSessionId() || undefined
  }

  while (attempt < MAX_RETRIES) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user logged in')
        // Save to localStorage as fallback
        localStorageFallback.saveConversation(conversation)
        return
      }

      // Get current session info
      const currentSession = sessionManager.getCurrentSession()
      
      // Prepare conversation data with session info
      const conversationData = {
        id: conversation.metadata.id,
        user_id: user.id,
        title: conversation.metadata.title,
        summary: conversation.metadata.lastMessage,
        agent_type: conversation.metadata.agentType || 'analysis',
        model: conversation.metadata.model,
        session_id: conversation.metadata.sessionId,
        query_count: currentSession?.queryCount || 1,
        follow_up_count: currentSession?.followUpCount || 0,
        metadata: {
          ip_address: 'client-ip', // This should come from backend in production
          user_agent: navigator.userAgent
        },
        updated_at: new Date().toISOString()
      }

      // Upsert conversation
      const { error: convError } = await supabase
        .from('conversations')
        .upsert(conversationData)
        .eq('id', conversation.metadata.id)

      if (convError) {
        throw convError
      }

      // Delete existing messages for this conversation
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversation.metadata.id)

      // Insert new messages with query tracking
      if (conversation.messages.length > 0) {
        let queryNumber = 0
        const messagesData = conversation.messages.map((msg, index) => {
          if (msg.type === 'user') queryNumber++
          
          return {
            conversation_id: conversation.metadata.id,
            user_id: user.id,
            role: msg.type,
            content: msg.content,
            sequence_number: index,
            is_follow_up: msg.type === 'user' && queryNumber > 1,
            query_number: msg.type === 'user' ? queryNumber : null,
            metadata: {
              model: (msg as any).model,
              timestamp: msg.timestamp.toISOString(),
              sessionId: conversation.metadata.sessionId
            }
          }
        })

        const { error: msgError } = await supabase
          .from('messages')
          .insert(messagesData)

        if (msgError) {
          throw msgError
        }
      }

      // Update usage metrics
      await updateUsageMetrics(user.id, conversation.messages.filter(m => m.type === 'user').length)
      
      // Success - break out of retry loop
      return
      
    } catch (error) {
      attempt++
      
      // Log the error
      await errorTracker.logError(
        'database',
        `Failed to save conversation (attempt ${attempt}/${MAX_RETRIES})`,
        {
          conversationId: conversation.metadata.id,
          retryAttempt: attempt
        },
        error
      )

      if (attempt >= MAX_RETRIES) {
        console.error('All retry attempts failed, saving to localStorage as fallback')
        // Fallback to localStorage
        localStorageFallback.saveConversation(conversation)
        
        // Queue for later sync
        queueForSync(conversation)
        return
      }

      // Wait before retrying (exponential backoff)
      await delay(Math.pow(2, attempt) * 1000)
    }
  }
}

// Delete a conversation from Supabase
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Messages will be deleted automatically due to CASCADE
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting conversation:', error)
    }
  } catch (error) {
    console.error('Error in deleteConversation:', error)
  }
}

// Get a specific conversation by ID
export async function getConversation(conversationId: string): Promise<SavedConversation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at,
          metadata
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (error || !conversation) {
      console.error('Error loading conversation:', error)
      return null
    }

    return {
      metadata: {
        id: conversation.id,
        title: conversation.title,
        lastMessage: conversation.summary || '',
        timestamp: new Date(conversation.updated_at),
        messageCount: conversation.messages?.length || 0,
        agentType: conversation.agent_type,
        model: conversation.model
      },
      messages: (conversation.messages || []).map((msg: any) => ({
        type: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        model: msg.metadata?.model
      }))
    }
  } catch (error) {
    console.error('Error in getConversation:', error)
    return null
  }
}

// Create metadata for a new conversation
export function createConversationMetadata(
  messages: Message[], 
  agentType: 'analysis' | 'research' = 'analysis',
  model?: string
): ConversationMetadata {
  const firstUserMessage = messages.find(m => m.type === 'user')
  const lastMessage = messages[messages.length - 1]
  
  return {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: firstUserMessage ? generateTitle(firstUserMessage.content) : 'New Conversation',
    lastMessage: lastMessage ? lastMessage.content.substring(0, 100) : '',
    timestamp: new Date(),
    messageCount: messages.length,
    agentType,
    model
  }
}

// Update usage metrics for a user
async function updateUsageMetrics(userId: string, newMessageCount: number): Promise<void> {
  try {
    // Get current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_metrics')
      .eq('id', userId)
      .single()

    const currentMetrics = profile?.usage_metrics || {
      total_messages: 0,
      messages_this_month: 0,
      messages_today: 0,
      last_reset_date: new Date().toISOString()
    }

    // Update metrics
    const today = new Date().toDateString()
    const lastReset = new Date(currentMetrics.last_reset_date).toDateString()
    
    const updatedMetrics = {
      total_messages: (currentMetrics.total_messages || 0) + newMessageCount,
      messages_this_month: (currentMetrics.messages_this_month || 0) + newMessageCount,
      messages_today: today === lastReset 
        ? (currentMetrics.messages_today || 0) + newMessageCount 
        : newMessageCount,
      last_reset_date: today === lastReset 
        ? currentMetrics.last_reset_date 
        : new Date().toISOString()
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({ 
        usage_metrics: updatedMetrics,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)
  } catch (error) {
    console.error('Error updating usage metrics:', error)
  }
}

// Get usage metrics for the current user
export async function getUserMetrics(): Promise<UsageMetrics | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_metrics, last_seen')
      .eq('id', user.id)
      .single()

    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const metrics = profile?.usage_metrics || {}
    
    return {
      totalMessages: metrics.total_messages || 0,
      messagesThisMonth: metrics.messages_this_month || 0,
      messagesToday: metrics.messages_today || 0,
      lastActiveAt: profile?.last_seen ? new Date(profile.last_seen) : new Date(),
      favoriteModel: metrics.favorite_model,
      totalConversations: conversationCount || 0
    }
  } catch (error) {
    console.error('Error getting user metrics:', error)
    return null
  }
}

// Helper function for delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Queue failed saves for later sync
function queueForSync(conversation: SavedConversation) {
  try {
    const queueKey = 'supabase_sync_queue'
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    queue.push({
      timestamp: new Date().toISOString(),
      type: 'conversation',
      data: conversation
    })
    localStorage.setItem(queueKey, JSON.stringify(queue))
  } catch (error) {
    console.error('Failed to queue for sync:', error)
  }
}

// Sync queued items when back online
export async function syncQueuedItems(): Promise<void> {
  try {
    const queueKey = 'supabase_sync_queue'
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    
    if (queue.length === 0) return
    
    const successfulSyncs: number[] = []
    
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      try {
        if (item.type === 'conversation') {
          await saveConversation(item.data)
          successfulSyncs.push(i)
        }
      } catch (error) {
        console.error('Failed to sync item:', error)
      }
    }
    
    // Remove successfully synced items
    const remainingQueue = queue.filter((_: any, index: number) => !successfulSyncs.includes(index))
    localStorage.setItem(queueKey, JSON.stringify(remainingQueue))
    
  } catch (error) {
    console.error('Failed to sync queue:', error)
  }
}