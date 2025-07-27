// AIDEV-NOTE: LocalStorage utilities for persisting conversation history
// Provides functions to save, load, and manage conversations in browser storage

import { Message } from '@/components/conversation/ConversationInterface'

export interface ConversationMetadata {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messageCount: number
}

export interface SavedConversation {
  metadata: ConversationMetadata
  messages: Message[]
}

const STORAGE_KEY = 'bioagent_conversations'
const MAX_CONVERSATIONS = 50 // Limit to prevent localStorage from getting too large

// Generate a conversation title from the first user message
export function generateTitle(firstMessage: string): string {
  // Truncate to a reasonable length and clean up
  const maxLength = 50
  const cleaned = firstMessage.trim().replace(/\n+/g, ' ')
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}

// Get all saved conversations from localStorage
export function getSavedConversations(): SavedConversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const conversations = JSON.parse(stored) as SavedConversation[]
    // Convert date strings back to Date objects
    return conversations.map(conv => ({
      ...conv,
      metadata: {
        ...conv.metadata,
        timestamp: new Date(conv.metadata.timestamp)
      },
      messages: conv.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }))
  } catch (error) {
    console.error('Error loading conversations:', error)
    return []
  }
}

// Save a conversation to localStorage
export function saveConversation(conversation: SavedConversation): void {
  try {
    const conversations = getSavedConversations()
    
    // Check if conversation already exists and update it
    const existingIndex = conversations.findIndex(c => c.metadata.id === conversation.metadata.id)
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation
    } else {
      // Add new conversation to the beginning
      conversations.unshift(conversation)
    }
    
    // Limit the number of saved conversations
    const limited = conversations.slice(0, MAX_CONVERSATIONS)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
  } catch (error) {
    console.error('Error saving conversation:', error)
    // Handle storage quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Remove oldest conversations and try again
      const conversations = getSavedConversations()
      const reduced = conversations.slice(0, Math.floor(MAX_CONVERSATIONS / 2))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced))
        saveConversation(conversation) // Retry
      } catch (retryError) {
        console.error('Failed to save even after cleanup:', retryError)
      }
    }
  }
}

// Delete a conversation from localStorage
export function deleteConversation(conversationId: string): void {
  try {
    const conversations = getSavedConversations()
    const filtered = conversations.filter(c => c.metadata.id !== conversationId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting conversation:', error)
  }
}

// Get a specific conversation by ID
export function getConversation(conversationId: string): SavedConversation | null {
  const conversations = getSavedConversations()
  return conversations.find(c => c.metadata.id === conversationId) || null
}

// Clear all conversations (useful for debugging or user preference)
export function clearAllConversations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing conversations:', error)
  }
}

// Create metadata for a new conversation
export function createConversationMetadata(messages: Message[]): ConversationMetadata {
  const firstUserMessage = messages.find(m => m.type === 'user')
  const lastMessage = messages[messages.length - 1]
  
  return {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: firstUserMessage ? generateTitle(firstUserMessage.content) : 'New Conversation',
    lastMessage: lastMessage ? lastMessage.content.substring(0, 100) : '',
    timestamp: new Date(),
    messageCount: messages.length
  }
}