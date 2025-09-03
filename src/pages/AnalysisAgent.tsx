// AIDEV-NOTE: Analysis Agent with complete dual-panel layout and all features
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Upload, FileText, Code, Image, List, 
  Brain, Home, 
  User, Sparkles, Loader2, CheckCircle, X,
  Eye, GripVertical, FileJson, Copy, 
  Check, Search, Beaker, Activity, 
  TestTube, PieChart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useConversationAutoSave } from '../hooks/useAutoSave'
import { CodeBlock, InlineCode } from '../components/CodeBlock'
import { sseParser } from '../services/intelligentSSEParser'
import { ImageDisplay } from '../components/ImageDisplay'
import { API_URLS } from '../config/api'
import { generateMultiplePlots } from '../services/mockImageGenerator'
import { sessionManager, type ModelType } from '../lib/sessionManager'
import { errorTracker } from '../lib/errorTracker'

// Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: { name: string; id: string }[]
  images?: string[]
  solution?: string
}

interface StatusStep {
  icon: string
  text: string
  detail?: string
  status: 'pending' | 'active' | 'completed'
}

interface TodoItem {
  id: number
  text: string
  completed: boolean
}

interface ExecutionEvent {
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
}

export default function AnalysisAgent() {
  const navigate = useNavigate()
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusSteps, setStatusSteps] = useState<StatusStep[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([])
  const [currentThinking, setCurrentThinking] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; id: string }[]>([])
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [accumulatedMessages, setAccumulatedMessages] = useState<string[]>([])
  const [rightPanelWidth, setRightPanelWidth] = useState(500)
  const [isResizing, setIsResizing] = useState(false)
  const [viewMode, setViewMode] = useState<'markdown' | 'json'>('markdown')
  const [copiedJson, setCopiedJson] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [isDark, setIsDark] = useState(true)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [messageCount, setMessageCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelType>('GPT4.1') // AIDEV-NOTE: Model selection state for switching between GPT4.1 and Claude Sonnet 4
  const [activeModel, setActiveModel] = useState<string | null>(null) // AIDEV-NOTE: Track which model is actually being used by backend
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const rightPanelEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Get user data and theme
    const userData = localStorage.getItem('bioagent_user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    const savedTheme = localStorage.getItem('theme')
    setIsDark(savedTheme === 'dark' || !savedTheme)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }

    // Initialize session
    initializeSession()
  }, [])

  // Initialize or continue session
  const initializeSession = async () => {
    try {
      // Check if we need a new session
      if (sessionManager.needsNewSession(selectedModel, 'analysis')) {
        const sessionId = await sessionManager.startNewSession(selectedModel, 'analysis')
        setCurrentSessionId(sessionId)
        console.log('Started new session:', sessionId)
      } else {
        const existingSession = sessionManager.getCurrentSessionId()
        setCurrentSessionId(existingSession)
        console.log('Continuing existing session:', existingSession)
      }
    } catch (error) {
      console.error('Failed to initialize session:', error)
      await errorTracker.logError('session', 'Failed to initialize session', {}, error)
    }
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStreamingMessage])

  useEffect(() => {
    rightPanelEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionEvents])

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      setRightPanelWidth(Math.min(800, Math.max(350, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])


  const handleLogout = () => {
    localStorage.removeItem('bioagent_authenticated')
    localStorage.removeItem('bioagent_user')
    window.location.reload()
  }

  // Initialize status steps
  const initializeStatusSteps = () => {
    setStatusSteps([
      { icon: '🔄', text: 'Connecting to Analysis Agent', status: 'active' },
      { icon: '📡', text: 'Connected', status: 'pending' },
      { icon: '🧠', text: 'Reasoning', status: 'pending' },
      { icon: '📝', text: 'Planning', status: 'pending' },
      { icon: '🔧', text: 'Executing tools', status: 'pending' },
      { icon: '📊', text: 'Processing results', status: 'pending' },
      { icon: '✅', text: 'Complete', status: 'pending' }
    ])
    setTodos([])
    setExecutionEvents([])
    setGeneratedImages([])
  }

  // Update status step
  const updateStatusStep = (index: number, status: 'active' | 'completed') => {
    setStatusSteps(prev => {
      const newSteps = [...prev]
      for (let i = 0; i <= index; i++) {
        if (i < index) {
          newSteps[i].status = 'completed'
        } else {
          newSteps[i].status = status
        }
      }
      return newSteps
    })
  }

  // Extract solution from content
  const extractSolution = (content: string) => {
    const solutionMatch = content.match(/<solution>([\s\S]*?)<\/solution>/i)
    if (solutionMatch) {
      return { solution: solutionMatch[1].trim() }
    }
    return { solution: null }
  }

  // Connect to stream
  const connectToStream = useCallback((query: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    initializeStatusSteps()
    setIsProcessing(true)
    setCurrentStreamingMessage('')
    setAccumulatedMessages([])

    const sessionId = `session_${Date.now()}`
    const params = new URLSearchParams({
      message: query,
      session_id: sessionId,
      model: selectedModel // AIDEV-NOTE: Pass selected model (GPT4.1 or Sonnet-4) to backend
    })

    try {
      const eventSource = new EventSource(`${API_URLS.ANALYSIS_AGENT}/api/chat/intelligent?${params}`)
      eventSourceRef.current = eventSource
      
      updateStatusStep(1, 'completed')
      updateStatusStep(2, 'active')

      let toolCallCount = 0

      // Handle the main message event  
      eventSource.addEventListener('message', async (event: MessageEvent) => {
        try {
          // First try to parse as JSON
          let data: any
          try {
            data = JSON.parse(event.data)
          } catch (e) {
            // If not JSON, treat as plain text message
            data = { type: 'message', content: event.data }
          }
          
          // Debug logging
          console.log('SSE Event:', { type: data.type, hasContent: !!data.content, contentLength: data.content?.length })
          
          // Accumulate all messages
          if (data.content) {
            setAccumulatedMessages(prev => [...prev, data.content])
            
            // Check for solution in content immediately
            if (data.content.includes('<solution>')) {
              console.log('Solution tag detected in message!')
            }
            
            // Use intelligent parser for complex messages
            try {
              const parsedEvents = await sseParser.parseSSEMessage(data.content)
              
              // Process parsed events for better understanding
              for (const parsedEvent of parsedEvents) {
                if (parsedEvent.type === 'reasoning' && parsedEvent.metadata?.reasoning) {
                  // Enhanced reasoning display
                  console.log('Intelligent parsing - Reasoning:', parsedEvent.content)
                } else if (parsedEvent.type === 'planning' && parsedEvent.metadata?.steps) {
                  // Enhanced planning with structured steps
                  console.log('Intelligent parsing - Planning:', parsedEvent.metadata.steps)
                } else if (parsedEvent.type === 'tool_call' && parsedEvent.metadata?.toolName) {
                  // Enhanced tool call with specific tool info
                  console.log('Intelligent parsing - Tool:', parsedEvent.metadata.toolName)
                }
              }
            } catch (parseError) {
              console.log('Intelligent parsing skipped:', parseError)
            }
          }
          
          // Handle different event types
          switch(data.type) {
            case 'model_info':
              // AIDEV-NOTE: Handle model info event from backend showing which model is actually being used
              setActiveModel(data.model)
              if (data.model !== data.requested && data.requested !== 'auto') {
                toast(`Using ${data.model} (${data.requested} unavailable)`, { icon: '⚠️' })
              }
              setExecutionEvents(prev => [...prev, {
                type: 'model_info',
                content: `Using model: ${data.model}`,
                timestamp: new Date(),
                status: 'completed'
              }])
              break
              
            case 'reasoning':
              updateStatusStep(2, 'active')
              setCurrentStreamingMessage(prev => prev + (data.content || '') + '\n')
              
              // Use intelligent parsing for better reasoning extraction
              let reasoningContent = data.content || ''
              let reasoningSnippet = 'Analyzing the task requirements...'
              
              // Try intelligent parsing first
              sseParser.parseSSEMessage(reasoningContent).then(parsedEvents => {
                const reasoningEvent = parsedEvents.find(e => e.type === 'reasoning')
                if (reasoningEvent) {
                  reasoningSnippet = reasoningEvent.content
                  setCurrentThinking(reasoningSnippet)
                }
              }).catch(() => {
                // Fallback to simple extraction
                reasoningSnippet = reasoningContent.includes('**Reasoning:**') 
                  ? reasoningContent.split('**Reasoning:**')[1]?.split('**')[0]?.trim()
                  : reasoningContent.slice(0, 200)
                setCurrentThinking(reasoningSnippet)
              })
              
              setExecutionEvents(prev => [...prev, {
                type: 'reasoning',
                content: reasoningSnippet,
                reasoning: reasoningContent,
                timestamp: new Date(),
                status: 'active'
              }])
              break
              
            case 'planning':
              updateStatusStep(3, 'active')
              
              // Try intelligent parsing for better plan extraction
              if (data.content) {
                sseParser.parseSSEMessage(data.content).then(parsedEvents => {
                  const planEvent = parsedEvents.find(e => e.type === 'planning')
                  if (planEvent?.metadata?.steps) {
                    const newTodos = planEvent.metadata.steps.map((step: any, idx: number) => ({
                      id: idx,
                      text: step.text || step,
                      completed: step.completed || false
                    }))
                    setTodos(newTodos)
                    setTotalSteps(newTodos.length)
                    
                    setExecutionEvents(prev => [...prev, {
                      type: 'planning',
                      content: `Creating ${newTodos.length}-step execution plan`,
                      timestamp: new Date(),
                      metadata: { steps: planEvent.metadata.steps },
                      status: 'completed',
                      total_steps: newTodos.length
                    }])
                  }
                }).catch(() => {
                  // Fallback to original logic
                  if (data.steps && data.steps.length > 0) {
                    const newTodos = data.steps.map((step: any, idx: number) => ({
                      id: idx,
                      text: typeof step === 'string' ? step : (step.step || step.text || ''),
                      completed: false
                    }))
                    setTodos(newTodos)
                    setTotalSteps(data.steps.length)
                    
                    const planContent = data.content || `Creating ${data.steps.length}-step execution plan`
                    
                    setExecutionEvents(prev => [...prev, {
                      type: 'planning',
                      content: planContent,
                      timestamp: new Date(),
                      metadata: { steps: data.steps },
                      status: 'completed',
                      total_steps: data.steps.length
                    }])
                  }
                })
              } else if (data.steps && data.steps.length > 0) {
                // Direct steps provided without content
                const newTodos = data.steps.map((step: any, idx: number) => ({
                  id: idx,
                  text: typeof step === 'string' ? step : (step.step || step.text || ''),
                  completed: false
                }))
                setTodos(newTodos)
                setTotalSteps(data.steps.length)
                
                setExecutionEvents(prev => [...prev, {
                  type: 'planning',
                  content: `Creating ${data.steps.length}-step execution plan`,
                  timestamp: new Date(),
                  metadata: { steps: data.steps },
                  status: 'completed',
                  total_steps: data.steps.length
                }])
              }
              break
              
            case 'tool_call':
              updateStatusStep(4, 'active')
              toolCallCount++
              setCurrentStep(toolCallCount)
              
              const toolName = data.tool_name || 'Code Execution'
              const language = data.language || 'python'
              setActiveToolCall(toolName)
              
              // Check if this is a visualization code (matplotlib)
              let generatedImages: string[] = []
              if (data.code && (data.code.includes('plt.show()') || data.code.includes('plt.figure') || data.code.includes('matplotlib'))) {
                // Generate mock plots for visualization
                generatedImages = generateMultiplePlots(data.code.includes('subplot') ? 4 : 2)
              }
              
              setExecutionEvents(prev => [...prev, {
                type: 'tool_call',
                content: `Running ${toolName}`,
                code: data.code,
                images: generatedImages,
                timestamp: new Date(),
                metadata: {
                  tool_name: toolName,
                  language: language
                },
                status: 'active',
                step_number: toolCallCount,
                total_steps: totalSteps
              }])
              
              // Mark todos as complete progressively based on tool execution
              // But leave the last one for the final answer
              if (toolCallCount <= todos.length - 1) {
                setTodos(prev => prev.map((todo, idx) => 
                  idx < toolCallCount ? { ...todo, completed: true } : todo
                ))
              }
              break
              
            case 'tool_output':
              updateStatusStep(5, 'active')
              setActiveToolCall(null)
              
              // Smart summarization of output
              let outputSummary = data.output || 'Tool execution completed'
              if (outputSummary.length > 500) {
                // Extract key information from output
                const lines = outputSummary.split('\n')
                const keyLines = lines.filter((line: string) => 
                  line.includes('success') || 
                  line.includes('result') || 
                  line.includes('found') ||
                  line.includes('complete') ||
                  line.includes('error')
                ).slice(0, 5)
                
                outputSummary = keyLines.length > 0 ? 
                  keyLines.join('\n') + `\n... (${lines.length} total lines)` :
                  outputSummary.slice(0, 400) + '...'
              }
              
              setExecutionEvents(prev => {
                // Update the last tool_call event to completed
                const updated = [...prev]
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].type === 'tool_call' && updated[i].status === 'active') {
                    updated[i].status = 'completed'
                    break
                  }
                }
                
                // Add observation event
                return [...updated, {
                  type: 'observation',
                  content: outputSummary,
                  observation: data.output,
                  timestamp: new Date(),
                  status: 'completed'
                }]
              })
              break
              
            case 'visualization':
              if (data.images && data.images.length > 0) {
                setGeneratedImages(prev => [...prev, ...data.images])
                setExecutionEvents(prev => [...prev, {
                  type: 'visualization',
                  content: data.caption || 'Generated visualization',
                  timestamp: new Date(),
                  metadata: { images: data.images }
                }])
              }
              break
              
            case 'final_answer':
              if (data.content && data.content.length > 10) {
                // Add a simple completion indicator to execution events (not the full content)
                setExecutionEvents(prev => [...prev, {
                  type: 'final_answer',
                  content: 'Protocol generated and delivered successfully!',
                  timestamp: new Date(),
                  expanded: true
                }])
                
                // Add to messages
                const finalMessage: Message = {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + data.content,
                  timestamp: new Date(),
                  solution: data.content,
                  images: generatedImages.length > 0 ? generatedImages : undefined
                }
                setMessages(prev => [...prev, finalMessage])
                
                // Mark only the last todo as complete (final protocol delivery)
                setTodos(prev => {
                  if (prev.length > 0) {
                    return prev.map((todo, idx) => 
                      idx === prev.length - 1 ? { ...todo, completed: true } : todo
                    )
                  }
                  return prev
                })
                
                // Update status to complete
                updateStatusStep(6, 'completed')
              }
              break
              
            case 'message':
            case 'ai_message':
              const aiContent = data.content || ''
              setCurrentStreamingMessage(prev => prev + aiContent + '\n')
              
              // Check if this AI message contains a solution tag
              if (aiContent.includes('<solution>') || aiContent.includes('</solution>')) {
                // Accumulate for final processing
                setAccumulatedMessages(prev => [...prev, aiContent])
                
                // Check if we have a complete solution in the current AI message
                const solutionMatch = aiContent.match(/<solution>([\s\S]*?)<\/solution>/i)
                if (solutionMatch) {
                  const solutionContent = solutionMatch[1].trim()
                  
                  // Add the ACTUAL solution to the left panel messages
                  const finalMessage: Message = {
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + solutionContent,
                    timestamp: new Date(),
                    solution: solutionContent,
                    images: generatedImages.length > 0 ? generatedImages : undefined
                  }
                  
                  setMessages(prev => {
                    // Check if we already have this solution
                    const hasSolution = prev.some(msg => msg.solution === solutionContent)
                    if (!hasSolution) {
                      return [...prev, finalMessage]
                    }
                    return prev
                  })
                  
                  // Add a simple completion indicator to execution events (not the full content)
                  setExecutionEvents(prev => [...prev, {
                    type: 'final_answer',
                    content: 'Protocol generated and delivered successfully!',
                    timestamp: new Date(),
                    expanded: true
                  }])
                  
                  // Mark last todo as complete
                  setTodos(prev => {
                    if (prev.length > 0) {
                      return prev.map((todo, idx) => 
                        idx === prev.length - 1 ? { ...todo, completed: true } : todo
                      )
                    }
                    return prev
                  })
                  
                  // Update status
                  updateStatusStep(6, 'completed')
                }
              }
              break
              
            case 'error':
              setExecutionEvents(prev => [...prev, {
                type: 'error',
                content: data.content || 'An error occurred',
                timestamp: new Date()
              }])
              break
              
            case 'done':
              handleDoneEvent()
              return
              
            default:
              // Handle mixed_content or other types
              if (data.events && Array.isArray(data.events)) {
                data.events.forEach((evt: any) => {
                  if (evt.type === 'visualization' && evt.images) {
                    setGeneratedImages(prev => [...prev, ...evt.images])
                  }
                })
              }
          }
        } catch (error) {
          console.error('Error parsing event:', error)
        }
      })
      
      // Handle done event
      const handleDoneEvent = () => {
        eventSource.close()
        eventSourceRef.current = null
        setIsProcessing(false)
        setCurrentThinking('')
        setActiveToolCall(null)
        setActiveModel(null) // AIDEV-NOTE: Clear active model when processing ends
        
        // Combine all accumulated messages and current streaming message
        const allContent = [...accumulatedMessages, currentStreamingMessage].join('\n')
        const { solution } = extractSolution(allContent)
        
        // Debug log
        console.log('Done event - checking for solution:', { 
          hasSolution: !!solution, 
          contentLength: allContent.length,
          solutionLength: solution?.length 
        })
        
        // Check if we already added the solution
        const alreadyHasSolution = messages.some(msg => msg.solution && msg.solution.length > 100)
        
        if (solution && !alreadyHasSolution) {
          // Add a simple completion indicator to execution events (not the full content)
          setExecutionEvents(prev => {
            // Double-check we don't already have this solution
            const exists = prev.some(e => e.type === 'final_answer')
            if (exists) return prev
            
            return [...prev, {
              type: 'final_answer',
              content: 'Protocol generated and delivered successfully!',
              timestamp: new Date(),
              expanded: true
            }]
          })
          
          const finalMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + solution,
            timestamp: new Date(),
            solution: solution,
            images: generatedImages.length > 0 ? generatedImages : undefined
          }
          
          // Add the final message with the solution
          setMessages(prev => {
            // Check if we already have this exact solution
            const hasSolution = prev.some(msg => msg.solution === solution)
            if (!hasSolution) {
              console.log('Adding final protocol to messages')
              // Track assistant message
              sessionManager.trackAssistantMessage()
              return [...prev, finalMessage]
            }
            return prev
          })
          
          updateStatusStep(6, 'completed')
        } else if (!solution && !alreadyHasSolution && currentStreamingMessage.trim()) {
          // If no solution but we have streaming content
          setMessages(prev => [...prev, {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: currentStreamingMessage,
            timestamp: new Date(),
            images: generatedImages.length > 0 ? generatedImages : undefined
          }])
        }
        
        setCurrentStreamingMessage('')
        // Don't automatically mark all todos as complete when stream ends
        // They should be marked complete progressively based on actual task completion
      }
      
      // Handle ping events
      eventSource.addEventListener('ping', () => {})
      
      // Handle errors
      eventSource.onerror = async (error) => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
        }
        eventSourceRef.current = null
        setIsProcessing(false)
        
        // Track the error
        await errorTracker.logAPIError(
          `${API_URLS.ANALYSIS_AGENT}/api/chat/intelligent`,
          0,
          'EventSource connection error',
          query
        )
        
        // Track error in session
        if (currentSessionId) {
          await sessionManager.trackError(error)
        }
        
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Connection error. Please ensure the backend server is running.',
          timestamp: new Date()
        }])
      }
      
    } catch (err) {
      console.error('Failed to connect:', err)
      setIsProcessing(false)
    }
  }, [generatedImages, messages, todos, currentStreamingMessage, accumulatedMessages, selectedModel])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isProcessing) return

    // Check message limit
    if (messageCount >= 5) {
      setShowLimitModal(true)
      return
    }

    // Ensure session is initialized
    if (!currentSessionId) {
      await initializeSession()
    }

    // Track user message in session
    try {
      const messageMetrics = await sessionManager.trackUserMessage(input)
      console.log('Message tracked:', messageMetrics)
    } catch (error) {
      console.error('Failed to track message:', error)
      await errorTracker.logError('tracking', 'Failed to track user message', {
        sessionId: currentSessionId
      }, error)
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setMessageCount(prev => prev + 1)
    connectToStream(input)
    setInput('')
    setUploadedFiles([])
    toast.success('Message sent!')
  }

  // Auto-save conversation
  const { triggerSave: saveConversation, loadFromLocalStorage } = useConversationAutoSave(
    sessionId,
    messages
  )

  // Load auto-saved conversation on mount
  useEffect(() => {
    const savedMessages = loadFromLocalStorage()
    if (savedMessages && savedMessages.length > 0) {
      toast.success('Restored previous conversation', { icon: '📂' })
      setMessages(savedMessages)
    }
  }, [sessionId])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: () => {
      setMessages([])
      setInput('')
      setStatusSteps([])
      setTodos([])
      setExecutionEvents([])
      setMessageCount(0)
      setShowLimitModal(false)
      setActiveModel(null) // AIDEV-NOTE: Reset active model indicator
      toast.success('New chat started')
    },
    onFocusInput: () => {
      textareaRef.current?.focus()
    },
    onSaveConversation: saveConversation,
    onSubmit: () => {
      if (input.trim() && !isProcessing) {
        handleSubmit()
      }
    },
    onClearChat: () => {
      setMessages([])
      setInput('')
      setMessageCount(0)
      setShowLimitModal(false)
      setActiveModel(null) // AIDEV-NOTE: Reset active model indicator
      toast.success('Chat cleared')
    }
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      id: `file-${Date.now()}-${Math.random()}`
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    toast.success(`${files.length} file(s) uploaded`, { icon: '📎' })
  }

  const stopProcessing = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsProcessing(false)
    toast('Processing stopped', { icon: '⏹️' })
  }

  const copyJsonToClipboard = () => {
    const jsonData = {
      todos,
      executionEvents,
      statusSteps
    }
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
    setCopiedJson(true)
    toast.success('JSON copied to clipboard!', { icon: '📋' })
    setTimeout(() => setCopiedJson(false), 2000)
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f0e1d] text-white relative overflow-hidden">
      {/* Background gradient effects - same as Welcome page */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-blue-600/5 pointer-events-none" />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/20 rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            animate={{ 
              y: -100,
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Header with glass-morphism */}
      <div className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                <Home className="w-5 h-5" />
                <span className="text-sm">Home</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Brain className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-lg font-light text-white">MandrakeBio Analysis Agent</h1>
                  <p className="text-xs text-cyan-400/80">Computational Biology & Protocol Generation</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <span className="text-sm text-gray-300">{user.name}</span>
                  {user.picture && (
                    <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-white/20" />
                  )}
                </div>
              )}
              
              <button 
                onClick={() => {
                  setMessages([])
                  setInput('')
                  setStatusSteps([])
                  setTodos([])
                  setExecutionEvents([])
                  setUploadedFiles([])
                  setCurrentStreamingMessage('')
                  setAccumulatedMessages([])
                  setMessageCount(0)
                  setShowLimitModal(false)
                  setActiveModel(null) // AIDEV-NOTE: Reset active model indicator
                  toast.success('New research started', { icon: '🔬' })
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-full transition-all"
                title="Start new research"
              >
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">New Research</span>
              </button>
              
              <button onClick={handleLogout} className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-sm">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Limit Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/10"
            >
              <div className="text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-orange-500" />
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Conversation Limit Reached
                </h3>
                
                {/* Message */}
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  You've reached the 5-message limit for this conversation to maintain optimal context.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Starting a new research session will help ensure accurate and relevant responses.
                </p>
                
                {/* Message count indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i <= messageCount ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Stay Here
                  </button>
                  <button
                    onClick={() => {
                      setMessages([])
                      setInput('')
                      setStatusSteps([])
                      setTodos([])
                      setExecutionEvents([])
                      setUploadedFiles([])
                      setCurrentStreamingMessage('')
                      setAccumulatedMessages([])
                      setMessageCount(0)
                      setShowLimitModal(false)
                      setActiveModel(null) // AIDEV-NOTE: Reset active model indicator
                      toast.success('New research started!', { icon: '✨' })
                    }}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Start New Research
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area with dual panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Chat Interface */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: rightPanelWidth + 'px' }}>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Empty State Dashboard */}
            {messages.length === 0 && !isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full relative">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-10 right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-10 left-20 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
                </div>

                {/* Main content */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative z-10 max-w-4xl w-full px-4"
                >
                  {/* Hero Section */}
                  <div className="text-center mb-12">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/20 mb-6"
                    >
                      <Beaker className="w-12 h-12 text-purple-400" />
                    </motion.div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                      MandrakeBio Analysis Agent
                    </h1>
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                      Advanced biomedical AI for data analysis, experiment planning, 
                      and scientific reasoning with code execution capabilities.
                    </p>
                  </div>

                  {/* Capabilities Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
                    >
                      <Activity className="w-8 h-8 text-purple-400 mb-3" />
                      <h3 className="text-white font-semibold mb-2">Data Analysis</h3>
                      <p className="text-gray-400 text-sm">
                        Process genomic, proteomic, and clinical datasets with advanced statistical methods
                      </p>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
                    >
                      <TestTube className="w-8 h-8 text-pink-400 mb-3" />
                      <h3 className="text-white font-semibold mb-2">Experiment Design</h3>
                      <p className="text-gray-400 text-sm">
                        Plan protocols, calculate sample sizes, and optimize experimental workflows
                      </p>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
                    >
                      <PieChart className="w-8 h-8 text-cyan-400 mb-3" />
                      <h3 className="text-white font-semibold mb-2">Visualizations</h3>
                      <p className="text-gray-400 text-sm">
                        Generate publication-ready figures, plots, and interactive data visualizations
                      </p>
                    </motion.div>
                  </div>

                  {/* Features List */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-purple-500/10 to-pink-600/10 backdrop-blur-md border border-purple-500/20 rounded-xl p-6"
                  >
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      Intelligent Capabilities:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        "Execute Python code for data analysis",
                        "Generate and run R scripts",
                        "Access biological databases",
                        "Create publication figures",
                        "Statistical hypothesis testing",
                        "Machine learning models"
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-300">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Example Prompts */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 text-center"
                  >
                    <p className="text-sm text-gray-400 mb-2">Try asking:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        "Analyze RNA-seq data",
                        "Design CRISPR experiment",
                        "Plot survival curves"
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInput(prompt)
                            textareaRef.current?.focus()
                          }}
                          className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-full text-gray-300 hover:bg-white/10 hover:border-purple-500/30 transition-all"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Messages */}
                {messages.map(message => (
              <div key={message.id} className={`${
                message.role === 'user' 
                  ? 'bg-white/5 border border-cyan-500/30' 
                  : 'bg-black/30 border border-white/10'
              } backdrop-blur-sm rounded-xl p-4 transition-all hover:border-white/20`}>
                <div className="flex items-start space-x-3">
                  {message.role === 'user' ? (
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <User className="w-5 h-5 text-cyan-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : undefined
                            
                            if (!inline && language) {
                              return (
                                <CodeBlock
                                  code={String(children).replace(/\n$/, '')}
                                  language={language}
                                  className={className}
                                />
                              )
                            }
                            
                            if (inline) {
                              return <InlineCode>{children}</InlineCode>
                            }
                            
                            return <code className={className} {...props}>{children}</code>
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Display images */}
                    {message.images && message.images.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Generated Visualizations:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {message.images.map((img, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden">
                              <img src={img} alt={`Visualization ${idx + 1}`} className="w-full h-auto" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display files */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span>Files: {message.files.map(f => f.name).join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
              </>
            )}

            {/* Current streaming message */}
            {isProcessing && currentStreamingMessage && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm animate-pulse">B</span>
                  </div>
                  <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          const language = match ? match[1] : undefined
                          
                          if (!inline && language) {
                            return (
                              <CodeBlock
                                code={String(children).replace(/\n$/, '')}
                                language={language}
                                className={className}
                              />
                            )
                          }
                          
                          if (inline) {
                            return <InlineCode>{children}</InlineCode>
                          }
                          
                          return <code className={className} {...props}>{children}</code>
                        }
                      }}
                    >
                      {currentStreamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && !currentStreamingMessage && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Processing your request...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-black/30 backdrop-blur-md p-4">
            {/* Message count indicator */}
            {messageCount > 0 && (
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Messages: {messageCount}/5
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i <= messageCount 
                            ? messageCount >= 4 
                              ? 'bg-orange-500' 
                              : 'bg-blue-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {messageCount >= 4 && (
                  <span className="text-xs text-orange-500 font-medium animate-pulse">
                    {messageCount === 5 ? 'Limit reached!' : 'Last message!'}
                  </span>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {/* File upload indicator */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{file.name}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setUploadedFiles(prev => prev.filter(f => f.id !== file.id))
                          toast.success('File removed', { icon: '🗑️', duration: 1500 })
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex space-x-3">
                {/* Model Selector Dropdown - AIDEV-NOTE: Toggle between GPT4.1 and Claude Sonnet 4 */}
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedModel}
                    onChange={async (e) => {
                      const newModel = e.target.value as ModelType
                      const oldModel = selectedModel
                      setSelectedModel(newModel)
                      
                      // Track model switch and start new session
                      if (oldModel !== newModel && currentSessionId) {
                        try {
                          const newSessionId = await sessionManager.onModelSwitch(newModel)
                          setCurrentSessionId(newSessionId)
                          console.log('Model switched, new session:', newSessionId)
                        } catch (error) {
                          console.error('Failed to switch model:', error)
                          await errorTracker.logError('model', `Failed to switch model from ${oldModel} to ${newModel}`, { 
                            model: newModel
                          }, error)
                        }
                      }
                    }}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white backdrop-blur-sm text-sm"
                    disabled={isProcessing}
                  >
                    <option value="GPT4.1" className="bg-gray-900 text-white">GPT 4.1</option>
                    <option value="Sonnet-4" className="bg-gray-900 text-white">Claude Sonnet 4</option>
                  </select>
                  {activeModel && isProcessing && (
                    <div className="flex items-center space-x-1 text-xs text-cyan-400">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                      <span>{activeModel === 'GPT4.1' ? 'GPT 4.1' : 'Claude Sonnet 4'}</span>
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={isProcessing}
                >
                  <Upload className="w-5 h-5" />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".csv,.txt,.json,.xlsx,.xls,.tsv,.pdf,.fasta,.fastq,.vcf,.bed,.gff,.gtf"
                />
                
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder="Ask me about biomedical analysis, protocols, or data... (Ctrl/Cmd+Enter to send)"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-gray-500 resize-none backdrop-blur-sm"
                  disabled={isProcessing}
                  rows={1}
                />
                
                {isProcessing ? (
                  <button
                    type="button"
                    onClick={stopProcessing}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || messageCount >= 5}
                    className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                      messageCount >= 5 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white'
                    }`}
                    onClick={(e) => {
                      if (messageCount >= 5) {
                        e.preventDefault()
                        setShowLimitModal(true)
                      }
                    }}
                  >
                    {messageCount >= 5 ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Limit Reached</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors"
          style={{ right: rightPanelWidth - 2 + 'px' }}
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Right Panel - Execution Steps */}
        <div className="absolute top-0 right-0 bottom-0 bg-black/40 backdrop-blur-md border-l border-white/10 flex flex-col" style={{ width: rightPanelWidth + 'px' }}>
          <div className="p-4 border-b border-white/10 bg-black/30">
            <div className="flex items-center justify-between">
              <h2 className="font-light text-lg text-white">Execution Steps</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode(viewMode === 'markdown' ? 'json' : 'markdown')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title={viewMode === 'markdown' ? 'Switch to JSON view' : 'Switch to Markdown view'}
                >
                  {viewMode === 'markdown' ? <FileJson className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {viewMode === 'json' && (
                  <button
                    onClick={copyJsonToClipboard}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Copy JSON to clipboard"
                  >
                    {copiedJson ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {viewMode === 'json' ? (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify({ todos, executionEvents, statusSteps }, null, 2)}
              </pre>
            ) : (
              <>
                {/* Todo List - Automatic Progress */}
                {todos.length > 0 && (
                  <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                    <h3 className="font-medium text-sm text-cyan-400 mb-3">Task Plan</h3>
                    <div className="space-y-2">
                      {todos.map(todo => (
                        <div 
                          key={todo.id} 
                          className="flex items-center space-x-2 p-2 bg-black/20 rounded-lg min-h-[36px]"
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            todo.completed 
                              ? 'bg-gradient-to-r from-cyan-500 to-teal-600 border-cyan-500' 
                              : 'border-gray-600 bg-gray-800/50'
                          } transition-all duration-300`}>
                            {todo.completed && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${
                            todo.completed 
                              ? 'text-gray-400 line-through' 
                              : 'text-gray-200'
                          } transition-all duration-300`}>
                            {todo.text}
                          </span>
                          {todo.completed && (
                            <div className="flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-cyan-500" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-time Thinking Process */}
                {currentThinking && isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-purple-500/10 to-pink-600/10 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span className="text-sm font-medium text-purple-400">AI Thinking...</span>
                      <div className="flex gap-1 ml-auto">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-300 italic line-clamp-3">
                      {currentThinking.slice(0, 150)}...
                    </div>
                  </motion.div>
                )}

                {/* Active Tool Execution */}
                {activeToolCall && isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 backdrop-blur-sm rounded-lg p-4 border border-green-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Code className="w-5 h-5 text-green-400" />
                        <motion.div
                          className="absolute inset-0 bg-green-400 rounded-full"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      <span className="text-sm font-medium text-green-400">Executing: {activeToolCall}</span>
                      {currentStep > 0 && totalSteps > 0 && (
                        <span className="ml-auto text-xs text-gray-400">
                          Step {currentStep}/{totalSteps}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(currentStep / Math.max(totalSteps, 1)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Execution Events with Enhanced Display */}
                {executionEvents.map((event, idx) => {
                  const eventConfig = {
                    reasoning: {
                      icon: Brain,
                      color: 'purple',
                      bgGradient: 'from-purple-500/10 to-purple-600/10',
                      borderColor: 'border-purple-500/20',
                      iconColor: 'text-purple-400'
                    },
                    planning: {
                      icon: List,
                      color: 'blue',
                      bgGradient: 'from-blue-500/10 to-blue-600/10',
                      borderColor: 'border-blue-500/20',
                      iconColor: 'text-blue-400'
                    },
                    tool_call: {
                      icon: Code,
                      color: 'green',
                      bgGradient: 'from-green-500/10 to-green-600/10',
                      borderColor: 'border-green-500/20',
                      iconColor: 'text-green-400'
                    },
                    observation: {
                      icon: Eye,
                      color: 'yellow',
                      bgGradient: 'from-yellow-500/10 to-yellow-600/10',
                      borderColor: 'border-yellow-500/20',
                      iconColor: 'text-yellow-400'
                    },
                    visualization: {
                      icon: Image,
                      color: 'pink',
                      bgGradient: 'from-pink-500/10 to-pink-600/10',
                      borderColor: 'border-pink-500/20',
                      iconColor: 'text-pink-400'
                    },
                    final_answer: {
                      icon: CheckCircle,
                      color: 'cyan',
                      bgGradient: 'from-cyan-500/10 to-teal-600/10',
                      borderColor: 'border-cyan-500/30',
                      iconColor: 'text-cyan-400'
                    },
                    error: {
                      icon: X,
                      color: 'red',
                      bgGradient: 'from-red-500/10 to-red-600/10',
                      borderColor: 'border-red-500/20',
                      iconColor: 'text-red-400'
                    }
                  }[event.type] || {
                    icon: Activity,
                    color: 'gray',
                    bgGradient: 'from-gray-500/10 to-gray-600/10',
                    borderColor: 'border-gray-500/20',
                    iconColor: 'text-gray-400'
                  }

                  const Icon = eventConfig.icon

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-lg p-4 border bg-gradient-to-r ${eventConfig.bgGradient} ${eventConfig.borderColor} backdrop-blur-sm`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <Icon className={`w-4 h-4 ${eventConfig.iconColor}`} />
                            {event.status === 'active' && (
                              <motion.div
                                className={`absolute inset-0 ${eventConfig.iconColor.replace('text', 'bg')} rounded-full`}
                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-200 capitalize">
                            {event.type.replace('_', ' ')}
                          </span>
                          {event.status === 'completed' && (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          )}
                          {event.step_number && event.total_steps && (
                            <span className="text-xs text-gray-400">
                              ({event.step_number}/{event.total_steps})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {event.content && (
                        <div className="text-sm text-gray-300">
                          {event.type === 'tool_call' && event.code ? (
                            <div className="mt-2">
                              <div className="text-xs text-gray-400 mb-1">Executing code:</div>
                              <pre className="bg-gray-900/50 text-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
                                <code>{event.code.slice(0, 300)}{event.code.length > 300 ? '...' : ''}</code>
                              </pre>
                            </div>
                          ) : event.type === 'planning' && event.metadata?.steps ? (
                            <div className="mt-2">
                              <div className="text-xs text-gray-400 mb-1">Execution plan ({event.metadata.steps.length} steps):</div>
                              <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                {event.metadata.steps.slice(0, 3).map((step: any, stepIdx: number) => (
                                  <li key={stepIdx} className="truncate">
                                    {typeof step === 'string' ? step : (step.step || step.text || '')}
                                  </li>
                                ))}
                                {event.metadata.steps.length > 3 && (
                                  <li className="text-gray-500">... and {event.metadata.steps.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          ) : event.type === 'observation' ? (
                            <div className="mt-2 bg-gray-900/30 rounded p-2">
                              <div className="text-xs text-gray-400 mb-1">Result:</div>
                              <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {event.content}
                              </div>
                            </div>
                          ) : event.type === 'final_answer' ? (
                            <motion.div 
                              className="bg-gradient-to-r from-cyan-500/20 to-teal-600/20 rounded-lg p-3 mt-2 border border-cyan-500/30"
                              initial={{ scale: 0.95 }}
                              animate={{ scale: 1 }}
                            >
                              <div className="text-sm text-cyan-400 font-semibold flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {event.content}
                              </div>
                            </motion.div>
                          ) : (
                            <div className="whitespace-pre-wrap">{event.content}</div>
                          )}
                        </div>
                      )}
                      
                      {/* Display images for visualization events */}
                      {event.type === 'visualization' && event.images && event.images.length > 0 && (
                        <div className="mt-3">
                          <ImageDisplay images={event.images} title="Generated Plots" />
                        </div>
                      )}
                      
                      {/* Also check for images in any event type */}
                      {event.type !== 'visualization' && event.images && event.images.length > 0 && (
                        <div className="mt-3">
                          <ImageDisplay images={event.images} />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </>
            )}
            <div ref={rightPanelEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}