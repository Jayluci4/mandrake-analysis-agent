import { useRef, useEffect } from 'react'
import { ConversationInterface, ConversationInterfaceRef } from '@/components/conversation/ConversationInterface'
import { useConversation } from '@/contexts/ConversationContext'

export function Conversations() {
  const conversationRef = useRef<ConversationInterfaceRef>(null)
  const { setConversationRef } = useConversation()
  
  // AIDEV-NOTE: Register conversation ref with context on mount
  useEffect(() => {
    setConversationRef(conversationRef)
  }, [setConversationRef])
  
  return <ConversationInterface ref={conversationRef} />
}