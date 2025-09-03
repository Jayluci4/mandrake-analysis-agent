import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bot, FileText, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MessageThread } from './MessageThread'
import { InputComposer } from './InputComposer'
import { SearchProgress } from './SearchProgress'
import { PapersPanel } from './PapersPanel'
import { useSearch } from '@/hooks/useSearch'
import { SearchResult, Paper } from '@/types'
import { useConversation } from '@/contexts/ConversationContext'
import { 
  SavedConversation, 
  saveConversation as saveToSupabase, 
  createConversationMetadata 
} from '@/lib/supabaseStorage'
import { sessionManager } from '@/lib/sessionManager'
import { errorTracker } from '@/lib/errorTracker'

export interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  result?: SearchResult
  timestamp: Date
}

// AIDEV-NOTE: Export a ref to allow parent components to clear conversation
export interface ConversationInterfaceRef {
  clearConversation: () => void
}

export const ConversationInterface = React.forwardRef<ConversationInterfaceRef>((_, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [streamingPapers, setStreamingPapers] = useState<Paper[]>([])
  const [streamingSummary, setStreamingSummary] = useState<string>('')
  const [isStreamingAnalysis, setIsStreamingAnalysis] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { setLoadConversationHandler, setCurrentConversationId } = useConversation()
  
  const { search, isSearching, progress } = useSearch({
    onPapersStream: (papers, phase, count) => {
      // Handle paper streaming - papers appear immediately in the right panel
      console.log(`Streaming ${count} papers (${phase} phase)`)
      if (phase === 'initial') {
        setStreamingPapers(papers)
      } else {
        setStreamingPapers(prev => [...prev, ...papers])
      }
    },
    onSummaryStream: (chunk) => {
      // Handle summary streaming
      setIsStreamingAnalysis(true)
      setStreamingSummary(prev => prev + chunk)
    },
    onResult: (searchResult) => {
      // Final result - update the streaming message with final content
      setIsStreamingAnalysis(false)
      
      // Add or update AI response with the complete result
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: searchResult.analysis,
        result: {
          ...searchResult,
          papers: streamingPapers.length > 0 ? streamingPapers : searchResult.papers
        },
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      
      // Reset streaming states
      setStreamingSummary('')
      setStreamingPapers([])
    },
    onError: (errorMsg) => {
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: `Error: ${errorMsg}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      
      // Reset streaming states
      setIsStreamingAnalysis(false)
      setStreamingSummary('')
      setStreamingPapers([])
    },
  })

  const scrollToBottom = () => {
    // Only scroll if there are messages (don't auto-scroll on empty state)
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // AIDEV-NOTE: Clear conversation function to reset all messages
  // Also resets the conversation ID to start a new conversation
  const clearConversation = () => {
    setMessages([])
    setConversationId(null)
    setCurrentConversationId(null)
  }

  // AIDEV-NOTE: Auto-save conversation whenever messages change
  // Only saves if there are messages and we have a conversation ID
  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      const currentSessionId = sessionManager.getCurrentSessionId()
      const metadata = createConversationMetadata(messages, 'research', undefined) // Research agent
      const savedConversation: SavedConversation = {
        metadata: { 
          ...metadata, 
          id: conversationId,
          sessionId: currentSessionId || undefined
        },
        messages
      }
      
      // Save to Supabase with error handling
      saveToSupabase(savedConversation).catch(error => {
        console.error('Failed to save conversation:', error)
        errorTracker.logError('database', 'Failed to save conversation', {
          conversationId,
          sessionId: currentSessionId
        }, error)
      })
    }
  }, [messages, conversationId])

  // AIDEV-NOTE: Load conversation handler - allows loading saved conversations
  const loadConversationHandler = useCallback((conversation: SavedConversation) => {
    setMessages(conversation.messages)
    setConversationId(conversation.metadata.id)
  }, [])

  // Register the load handler with the context
  useEffect(() => {
    setLoadConversationHandler(loadConversationHandler)
  }, [loadConversationHandler, setLoadConversationHandler])

  // Expose clearConversation to parent components via ref
  React.useImperativeHandle(ref, () => ({
    clearConversation
  }))

  const handleSendMessage = (query: string) => {
    // Generate conversation ID if this is the first message
    if (!conversationId && messages.length === 0) {
      const newId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setConversationId(newId)
      setCurrentConversationId(newId)
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    
    // Start search
    search(query)
  }

  // Collect all papers from AI messages with results + streaming papers
  const allPapers = useMemo(() => {
    const papers: Paper[] = []
    
    // Add streaming papers first (if any)
    if (streamingPapers.length > 0) {
      papers.push(...streamingPapers)
    } else {
      // Otherwise collect from messages
      messages.forEach(message => {
        if (message.type === 'ai' && message.result?.papers) {
          papers.push(...message.result.papers)
        }
      })
    }
    
    return papers
  }, [messages, streamingPapers])

  // Check if we should show split layout (when there are papers)
  const shouldShowSplitLayout = allPapers.length > 0
  const [showPapersPanel, setShowPapersPanel] = useState(false)

  return (
    <div className="h-full flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Area */}
        <div className={`flex flex-col ${shouldShowSplitLayout ? 'lg:w-1/2' : ''} flex-1`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <MessageThread messages={messages} />
            
            {/* Search Progress */}
            {isSearching && (
              <div className="px-3 py-2">
                <SearchProgress progress={progress} />
              </div>
            )}
            
            {/* Streaming Analysis */}
            {isStreamingAnalysis && streamingSummary && (
              <div className="px-3 py-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-3"
                >
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-secondary to-accent-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingSummary}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        <span className="text-xs text-gray-400">Analyzing research...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Papers Panel - Desktop */}
        {shouldShowSplitLayout && (
          <div className="hidden lg:block lg:w-1/2">
            <PapersPanel papers={allPapers} isVisible={shouldShowSplitLayout} />
          </div>
        )}
        
        {/* Papers Panel - Mobile Overlay */}
        {shouldShowSplitLayout && showPapersPanel && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background-primary">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                <h2 className="text-lg font-semibold">Research Papers</h2>
                <button
                  onClick={() => setShowPapersPanel(false)}
                  className="p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PapersPanel papers={allPapers} isVisible={true} />
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Papers Toggle Button */}
        {shouldShowSplitLayout && (
          <button
            onClick={() => setShowPapersPanel(true)}
            className="lg:hidden fixed bottom-20 right-4 p-3 bg-gradient-to-r from-cyan-500 to-teal-600 rounded-full shadow-lg shadow-cyan-500/25 z-40"
          >
            <FileText className="w-5 h-5 text-white" />
            {allPapers.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {allPapers.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Input Composer */}
      <div className="border-t border-white/10">
        <InputComposer 
          onSend={handleSendMessage} 
          disabled={isSearching}
        />
      </div>
    </div>
  )
})