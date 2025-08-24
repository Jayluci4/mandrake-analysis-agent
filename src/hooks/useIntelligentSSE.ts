// AIDEV-NOTE: Hook for intelligent SSE stream processing
import { useState, useCallback, useRef } from 'react'
import { sseParser, ParsedSSEEvent } from '../services/intelligentSSEParser'

export interface ProcessedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  solution?: string
  images?: string[]
}

export interface ExecutionEvent {
  type: string
  content?: string
  timestamp: Date
  expanded?: boolean
  metadata?: any
  status?: 'pending' | 'active' | 'completed' | 'error'
  reasoning?: string
  observation?: string
  code?: string
  language?: string
  tool_name?: string
  step_number?: number
  total_steps?: number
  images?: string[]
  plotType?: string
}

export interface TodoItem {
  id: number
  text: string
  completed: boolean
}

export function useIntelligentSSE() {
  const [messages, setMessages] = useState<ProcessedMessage[]>([])
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [currentThinking, setCurrentThinking] = useState('')
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const messageBufferRef = useRef<string>('')
  const toolCallCountRef = useRef(0)

  const processSSEEvent = useCallback(async (rawData: string) => {
    try {
      // Parse the raw SSE data
      const parsedEvents = await sseParser.parseSSEMessage(rawData)
      
      for (const event of parsedEvents) {
        // Handle events based on display side
        if (event.displaySide === 'left' || event.displaySide === 'both') {
          // Add to messages for left panel
          if (event.type === 'final_answer' && event.metadata?.solution) {
            const finalMessage: ProcessedMessage = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + event.metadata.solution,
              timestamp: event.timestamp,
              solution: event.metadata.solution
            }
            setMessages(prev => [...prev, finalMessage])
          }
        }
        
        if (event.displaySide === 'right' || event.displaySide === 'both') {
          // Add to execution events for right panel
          const execEvent: ExecutionEvent = {
            type: event.type,
            content: event.content,
            timestamp: event.timestamp,
            metadata: event.metadata,
            status: 'active'
          }
          
          // Handle specific event types
          switch (event.type) {
            case 'reasoning':
              setCurrentThinking(event.content)
              execEvent.reasoning = event.metadata?.reasoning || event.content
              break
              
            case 'planning':
              if (event.metadata?.steps) {
                const newTodos = event.metadata.steps.map((step: any, idx: number) => ({
                  id: idx,
                  text: step.text || step,
                  completed: step.completed || false
                }))
                setTodos(newTodos)
                setTotalSteps(newTodos.length)
              }
              break
              
            case 'tool_call':
              toolCallCountRef.current++
              setCurrentStep(toolCallCountRef.current)
              setActiveToolCall(event.metadata?.toolName || 'Tool Execution')
              execEvent.code = event.metadata?.code
              execEvent.language = event.metadata?.language || 'python'
              execEvent.tool_name = event.metadata?.toolName
              execEvent.step_number = toolCallCountRef.current
              execEvent.total_steps = totalSteps
              
              // Update todos progressively
              setTodos(prev => prev.map((todo, idx) => 
                idx < toolCallCountRef.current ? { ...todo, completed: true } : todo
              ))
              break
              
            case 'observation':
              setActiveToolCall(null)
              execEvent.observation = event.metadata?.observation || event.content
              execEvent.status = 'completed'
              
              // Update the last tool_call event to completed
              setExecutionEvents(prev => {
                const updated = [...prev]
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].type === 'tool_call' && updated[i].status === 'active') {
                    updated[i].status = 'completed'
                    break
                  }
                }
                return updated
              })
              break
              
            case 'visualization':
              // Handle visualization events
              execEvent.plotType = event.metadata?.plotType
              execEvent.status = 'active'
              execEvent.code = event.metadata?.code
              execEvent.language = 'python'
              // Note: Actual image data would come from observation event after this
              break
              
            case 'final_answer':
              execEvent.status = 'completed'
              setActiveToolCall(null)
              setCurrentThinking('')
              
              // Mark last todo as complete
              setTodos(prev => {
                if (prev.length > 0) {
                  return prev.map((todo, idx) => 
                    idx === prev.length - 1 ? { ...todo, completed: true } : todo
                  )
                }
                return prev
              })
              break
          }
          
          setExecutionEvents(prev => [...prev, execEvent])
        }
      }
    } catch (error) {
      console.error('Error processing SSE event:', error)
    }
  }, [totalSteps])

  const connectToIntelligentStream = useCallback((query: string, sessionId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    
    // Reset state
    setIsProcessing(true)
    setMessages([])
    setExecutionEvents([])
    setTodos([])
    setCurrentThinking('')
    setActiveToolCall(null)
    setCurrentStep(0)
    setTotalSteps(0)
    toolCallCountRef.current = 0
    messageBufferRef.current = ''
    
    // Add user message
    const userMessage: ProcessedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date()
    }
    setMessages([userMessage])
    
    // Connect to SSE stream
    const params = new URLSearchParams({
      message: query,
      session_id: sessionId
    })
    
    const eventSource = new EventSource(`http://localhost:8003/api/chat/intelligent?${params}`)
    eventSourceRef.current = eventSource
    
    // Handle message events
    eventSource.addEventListener('message', async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        
        // Buffer messages for intelligent parsing
        if (data.content) {
          messageBufferRef.current += data.content + '\n'
        }
        
        // Process the event
        await processSSEEvent(JSON.stringify(data))
        
        // Handle special cases
        if (data.type === 'done') {
          setIsProcessing(false)
          setActiveToolCall(null)
          setCurrentThinking('')
          
          // Process any remaining buffered content
          if (messageBufferRef.current) {
            await processSSEEvent(messageBufferRef.current)
            messageBufferRef.current = ''
          }
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error)
      }
    })
    
    // Handle errors
    eventSource.onerror = () => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close()
      }
      eventSourceRef.current = null
      setIsProcessing(false)
      setActiveToolCall(null)
      setCurrentThinking('')
      
      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Connection error. Please ensure the backend server is running on port 8003.',
        timestamp: new Date()
      }])
    }
    
    return eventSource
  }, [processSSEEvent])
  
  const stopProcessing = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsProcessing(false)
    setActiveToolCall(null)
    setCurrentThinking('')
  }, [])
  
  return {
    messages,
    executionEvents,
    todos,
    currentThinking,
    activeToolCall,
    isProcessing,
    currentStep,
    totalSteps,
    connectToIntelligentStream,
    stopProcessing
  }
}