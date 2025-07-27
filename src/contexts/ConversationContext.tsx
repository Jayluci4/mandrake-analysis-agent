import React, { createContext, useContext, useRef, ReactNode, useState } from 'react'
import { ConversationInterfaceRef } from '@/components/conversation/ConversationInterface'
import { SavedConversation } from '@/lib/conversationStorage'

// AIDEV-NOTE: Context to provide conversation control functions globally
// Extended to support conversation history management
interface ConversationContextType {
  clearConversation: () => void
  setConversationRef: (ref: React.RefObject<ConversationInterfaceRef>) => void
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
  loadConversation: (conversation: SavedConversation) => void
  setLoadConversationHandler: (handler: (conversation: SavedConversation) => void) => void
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const conversationRef = useRef<ConversationInterfaceRef | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const loadConversationHandler = useRef<((conversation: SavedConversation) => void) | null>(null)

  const clearConversation = () => {
    conversationRef.current?.clearConversation()
    setCurrentConversationId(null)
  }

  const setConversationRef = (ref: React.RefObject<ConversationInterfaceRef>) => {
    conversationRef.current = ref.current
  }

  const loadConversation = (conversation: SavedConversation) => {
    if (loadConversationHandler.current) {
      loadConversationHandler.current(conversation)
      setCurrentConversationId(conversation.metadata.id)
    }
  }

  const setLoadConversationHandler = (handler: (conversation: SavedConversation) => void) => {
    loadConversationHandler.current = handler
  }

  return (
    <ConversationContext.Provider value={{ 
      clearConversation, 
      setConversationRef,
      currentConversationId,
      setCurrentConversationId,
      loadConversation,
      setLoadConversationHandler
    }}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider')
  }
  return context
}