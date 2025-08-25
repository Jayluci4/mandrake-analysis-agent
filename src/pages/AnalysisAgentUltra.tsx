// AIDEV-NOTE: AnalysisAgent with glass morphism design
import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Send, Upload, FileText, Code, Image, List, 
  Brain, Home, Play, Loader, CheckCircle, X,
  User, Sparkles, Loader2, Eye, GripVertical, 
  FileJson, Copy, Check, Search, Beaker, 
  Activity, TestTube, PieChart, ChevronDown, 
  ChevronRight, FileText as FileMarkdown
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { generateMultiplePlots } from '../services/mockImageGenerator'
import { ImageDisplay } from '../components/ImageDisplay'
import { API_URLS } from '../config/api'

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
}

const AnalysisAgentUltra: React.FC = () => {
  const navigate = useNavigate()
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusSteps, setStatusSteps] = useState<StatusStep[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; id: string }[]>([])
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [accumulatedMessages, setAccumulatedMessages] = useState<string[]>([])
  const [rightPanelWidth, setRightPanelWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [viewMode, setViewMode] = useState<'markdown' | 'json'>('markdown')
  const [copiedJson, setCopiedJson] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [sessionId] = useState(`session_${Date.now()}`)
  const [messageCount, setMessageCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'GPT4.1' | 'Sonnet-4'>('GPT4.1') // AIDEV-NOTE: Model selection state for switching between GPT4.1 and Claude Sonnet 4
  const [activeModel, setActiveModel] = useState<string | null>(null) // AIDEV-NOTE: Track which model is actually being used by backend
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const rightPanelEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      setRightPanelWidth(Math.min(800, Math.max(300, newWidth)))
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

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        id: `file-${Date.now()}-${Math.random()}`
      }))
      setUploadedFiles(prev => [...prev, ...newFiles])
      toast.success(`${files.length} file(s) uploaded`, { icon: '📎' })
    }
  }

  // Extract solution from text
  const extractSolution = (text: string): { solution: string | null; beforeSolution: string; afterSolution: string } => {
    const solutionRegex = /<solution>([\s\S]*?)<\/solution>/i
    const match = text.match(solutionRegex)
    
    if (match) {
      const solutionContent = match[1].trim()
      const beforeSolution = text.substring(0, match.index || 0).trim()
      const afterSolution = text.substring((match.index || 0) + match[0].length).trim()
      
      return {
        solution: solutionContent,
        beforeSolution,
        afterSolution
      }
    }
    
    return { solution: null, beforeSolution: text, afterSolution: '' }
  }

  // Copy JSON to clipboard
  const copyJsonToClipboard = () => {
    const jsonData = {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        solution: m.solution
      })),
      executionEvents,
      todos
    }
    
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
    setCopiedJson(true)
    toast.success('JSON copied to clipboard!', { icon: '📋' })
    setTimeout(() => setCopiedJson(false), 2000)
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

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return
    
    // Check message limit
    if (messageCount >= 5) {
      setShowLimitModal(true)
      toast.error('Message limit reached. Please start a new conversation.', { icon: '⚠️' })
      return
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: uploadedFiles
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)
    setMessageCount(prev => prev + 1)
    setCurrentStreamingMessage('')
    setAccumulatedMessages([])
    setGeneratedImages([])
    setExecutionEvents([])
    setTodos([])
    
    // Initialize status steps
    setStatusSteps([
      { icon: '🚀', text: 'New task launched', status: 'active' },
      { icon: '🔍', text: 'Retrieving resources...', status: 'pending' },
      { icon: '🤖', text: 'Starting the agent...', status: 'pending' },
      { icon: '🧠', text: 'Reasoning...', status: 'pending' },
      { icon: '📋', text: 'Planning...', status: 'pending' },
      { icon: '⚡', text: 'Executing...', status: 'pending' },
      { icon: '📊', text: 'Observing...', status: 'pending' },
      { icon: '✅', text: 'Complete', status: 'pending' }
    ])

    try {
      // Connect to SSE endpoint with model parameter - AIDEV-NOTE: Pass selected model to backend
      const url = `${API_URLS.ANALYSIS_AGENT}/api/chat/intelligent?message=${encodeURIComponent(userMessage.content)}&session_id=${sessionId}&model=${selectedModel}`
      console.log('Connecting to SSE endpoint:', url)
      
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource
      
      let hasReceivedEvent = false
      let connectionTimeout: NodeJS.Timeout
      let toolCallCount = 0
      
      // Set a timeout for initial connection
      connectionTimeout = setTimeout(() => {
        if (!hasReceivedEvent) {
          console.warn('No events received after 10 seconds')
          setCurrentStreamingMessage('Processing your request... This may take a moment as the agent initializes.')
        }
      }, 10000)
      
      // Add connection opened handler
      eventSource.onopen = () => {
        console.log('SSE connection opened successfully')
        setCurrentStreamingMessage('Connected. Processing your request...')
        toast.success('Connected to Analysis Agent', { icon: '🔗' })
      }
      
      // Helper to mark that we've received data
      const markEventReceived = () => {
        if (!hasReceivedEvent) {
          hasReceivedEvent = true
          clearTimeout(connectionTimeout)
          setCurrentStreamingMessage('')
        }
      }
      
      // Handle generic messages
      eventSource.onmessage = function(event) {
        try {
          markEventReceived()
          console.log('Received message:', event.data)
          const data = JSON.parse(event.data)
          
          // Route based on type field in the data
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
                metadata: { model: data.model }
              }])
              break
            case 'planning':
              handlePlanningEvent(data)
              break
            case 'reasoning':
              handleReasoningEvent(data)
              break
            case 'tool_call':
              handleToolCallEvent(data)
              break
            case 'observation':
            case 'tool_output':
              handleObservationEvent(data)
              break
            case 'ai_message':
              handleAiMessageEvent(data)
              break
            case 'final_answer':
              handleFinalAnswerEvent(data)
              break
            case 'visualization':
            case 'image':
              handleVisualizationEvent(data)
              break
            case 'done':
              handleDoneEvent()
              break
            case 'error':
              handleErrorEvent(data)
              break
            default:
              console.log('Unknown event type:', data.type)
          }
        } catch (e) {
          console.error('Failed to parse message:', e, event.data)
        }
      }
      
      // Handler functions
      const handleFinalAnswerEvent = (data: any) => {
        let finalContent = data.content || ''
        console.log('Received final_answer event, length:', finalContent.length)
        
        // Remove any prompt instructions
        finalContent = finalContent.replace(/CRITICAL[^\n]*provide[^\n]*protocol[^\n]*/gi, '')
        finalContent = finalContent.replace(/End your response with[^\n]*/gi, '')
        
        // Check if content already has solution tags
        const solutionMatch = finalContent.match(/<solution>([\s\S]*?)<\/solution>/)
        if (solutionMatch) {
          finalContent = solutionMatch[1].trim()
        }
        
        if (finalContent && finalContent.length > 10) {
          setAccumulatedMessages(prev => [...prev, `<solution>${finalContent}</solution>`])
          
          setCurrentStreamingMessage('📋 Solution/Protocol Found!')
          updateStatusStep(6, 'completed')
          
          // Add the solution to the left panel
          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + finalContent,
            timestamp: new Date(),
            solution: finalContent,
            images: generatedImages.length > 0 ? generatedImages : undefined
          }])
          
          // Also add to execution events
          setExecutionEvents(prev => [...prev, {
            type: 'final_protocol',
            content: finalContent,
            timestamp: new Date()
          }])
          
          // Mark todos as complete
          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })))
        }
      }
      
      const handleAiMessageEvent = (data: any) => {
        const content = data.content || ''
        console.log('Received ai_message event, length:', content.length)
        
        // Check if this message contains matplotlib code
        if (content.includes('plt.') || content.includes('matplotlib')) {
          console.log('AI message contains visualization code')
          // Generate mock images for visualization
          const mockImages = generateMultiplePlots(2)
          setGeneratedImages(prev => [...prev, ...mockImages])
        }
        
        // Check if this AI message contains a solution
        const solutionMatch = content.match(/<solution>([\s\S]*?)<\/solution>/)
        if (solutionMatch) {
          console.log('✅ Found complete solution in ai_message!')
          const protocol = solutionMatch[1].trim()
          
          setAccumulatedMessages(prev => [...prev, `<solution>${protocol}</solution>`])
          setCurrentStreamingMessage('')
          updateStatusStep(6, 'completed')
          
          // Add the solution to the left panel
          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + protocol,
            timestamp: new Date(),
            solution: protocol,
            images: generatedImages.length > 0 ? generatedImages : undefined
          }])
          
          // Also add to execution events
          setExecutionEvents(prev => [...prev, {
            type: 'final_protocol',
            content: protocol,
            timestamp: new Date()
          }])
          
          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })))
        } else {
          // Regular AI message without solution
          setAccumulatedMessages(prev => {
            const updated = [...prev, content]
            console.log('Total accumulated messages:', updated.length)
            return updated
          })
          
          setCurrentStreamingMessage(content)
        }
        
        updateStatusStep(2, 'active')
        if (content.includes('Updated plan:') || content.includes('Checklist')) {
          updateStatusStep(4, 'active')
        }
      }
      
      const handlePlanningEvent = (data: any) => {
        console.log('Received planning event')
        updateStatusStep(4, 'active')
        
        if (data.steps && Array.isArray(data.steps)) {
          const newTodos = data.steps.map((step: any, index: number) => ({
            id: index + 1,
            text: typeof step === 'string' ? step : step.step || step.description || '',
            completed: step.status === 'completed'
          }))
          setTodos(newTodos)
          
          setExecutionEvents(prev => [...prev, {
            type: 'planning',
            content: 'Planning the next steps',
            timestamp: new Date(),
            metadata: { steps: data.steps }
          }])
        }
      }
      
      const handleReasoningEvent = (data: any) => {
        console.log('Received reasoning event')
        updateStatusStep(3, 'active')
        
        setExecutionEvents(prev => [...prev, {
          type: 'reasoning',
          content: data.content || data.reasoning || 'Reasoning about the task...',
          timestamp: new Date()
        }])
      }
      
      const handleToolCallEvent = (data: any) => {
        console.log('Received tool_call event:', data)
        toolCallCount++
        updateStatusStep(5, 'active')
        
        // Check if this is matplotlib/visualization code - check both code and content fields
        const code = data.code || data.content || ''
        if (code.includes('plt.') || code.includes('matplotlib') || code.includes('seaborn') || code.includes('plotly')) {
          console.log('Detected visualization code, generating mock plots...')
          const mockImages = generateMultiplePlots(code.includes('subplot') ? 4 : 2)
          setGeneratedImages(prev => [...prev, ...mockImages])
          
          // Add visualization event with images
          setExecutionEvents(prev => [...prev, {
            type: 'visualization',
            content: 'Generating plots...',
            timestamp: new Date(),
            expanded: true, // Auto-expand to show images
            metadata: {
              imageUrl: mockImages[0],
              images: mockImages,
              caption: 'Generated visualization'
            }
          }])
        }
        
        setExecutionEvents(prev => [...prev, {
          type: 'tool_call',
          content: code || data.tool_name || 'Executing tool...',
          timestamp: new Date(),
          expanded: code.length > 0, // Auto-expand if there's code
          metadata: {
            tool_name: data.tool_name,
            tool_id: data.tool_id,
            language: data.language || 'python',
            code: code
          }
        }])
        
        if (toolCallCount <= todos.length) {
          setTodos(prev => prev.map((todo, idx) => 
            idx < toolCallCount ? { ...todo, completed: true } : todo
          ))
        }
      }
      
      const handleObservationEvent = (data: any) => {
        console.log('Received observation event')
        updateStatusStep(6, 'active')
        
        setExecutionEvents(prev => [...prev, {
          type: 'observation',
          content: data.content || data.output || 'Observation from execution',
          timestamp: new Date()
        }])
      }
      
      const handleVisualizationEvent = (data: any) => {
        console.log('Received visualization event:', data)
        
        if (data.image || data.image_url || data.image_data) {
          const imageUrl = data.image_url || data.image || data.image_data
          setGeneratedImages(prev => [...prev, imageUrl])
          
          setExecutionEvents(prev => [...prev, {
            type: 'visualization',
            content: data.caption || 'Generated visualization',
            timestamp: new Date(),
            metadata: { imageUrl, caption: data.caption }
          }])
        }
      }
      
      const handleDoneEvent = () => {
        console.log('Received done event')
        
        eventSource.close()
        eventSourceRef.current = null
        setIsProcessing(false)
        setActiveModel(null) // AIDEV-NOTE: Clear active model when processing completes
        updateStatusStep(7, 'completed')
        
        // Process all accumulated messages
        const fullContent = accumulatedMessages.join('\n')
        console.log('Full accumulated content length:', fullContent.length)
        
        // Extract solution and other content
        const { solution } = extractSolution(fullContent)
        
        // Create the final message
        let finalMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: fullContent || currentStreamingMessage,
          timestamp: new Date(),
          images: generatedImages.length > 0 ? generatedImages : undefined,
          solution: solution || undefined
        }
        
        // Check if we already added the solution
        const alreadyHasSolution = messages.some(msg => msg.solution)
        
        if (solution && !alreadyHasSolution) {
          console.log('✅ Solution found in accumulated messages')
          finalMessage.content = '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + solution
          finalMessage.solution = solution
          setMessages(prev => [...prev, finalMessage])
          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })))
        } else if (!solution && !alreadyHasSolution) {
          console.log('⚠️ No solution found in the response')
          if (fullContent.trim()) {
            const cleanContent = accumulatedMessages
              .filter(msg => msg && msg.trim().length > 0)
              .filter(msg => !msg.includes('<solution>'))
              .join('\n\n')
            
            if (cleanContent.trim() && cleanContent.length > 50) {
              finalMessage.content = cleanContent
              setMessages(prev => [...prev, finalMessage])
            }
          }
        }
        
        setCurrentStreamingMessage('')
        toast.success('Task completed!', { icon: '✅' })
      }
      
      const handleErrorEvent = (data: any) => {
        console.error('Received error event:', data)
        setExecutionEvents(prev => [...prev, {
          type: 'error',
          content: data.content || data.error || 'An error occurred',
          timestamp: new Date()
        }])
        toast.error(data.content || 'An error occurred')
      }

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
        }
        eventSourceRef.current = null
        setIsProcessing(false)
        
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Connection error. Please ensure the backend server is running on port 8003.`,
          timestamp: new Date()
        }])
        
        toast.error('Connection lost', { icon: '🔌' })
      }

    } catch (err) {
      console.error('Failed to connect:', err)
      setIsProcessing(false)
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Failed to establish connection: ${err}`,
        timestamp: new Date()
      }])
      toast.error('Failed to connect')
    }
  }

  // Stop processing
  const stopProcessing = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsProcessing(false)
    setActiveModel(null) // AIDEV-NOTE: Clear active model when stopping
    toast('Processing stopped', { icon: '⏹️' })
  }

  // Toggle event expansion
  const toggleEventExpansion = (index: number) => {
    setExecutionEvents(prev => prev.map((event, i) => 
      i === index ? { ...event, expanded: !event.expanded } : event
    ))
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f0e1d] text-white relative overflow-hidden">
      {/* Background gradient effects */}
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
              transition: {
                duration: Math.random() * 20 + 10,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }
            }}
          />
        ))}
      </div>

      {/* Header with glass morphism */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
              <img
                src="/assets/asset-logo.png"
                alt="Mandrake Bioworks"
                className="relative w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(0,212,255,0.3)]"
              />
            </div>
            <div>
              <h1 className="text-lg font-medium text-white">
                MandrakeBio Analysis Agent
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Active
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                General biomedical AI tasks & protocol execution
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-md hover:bg-white/10 transition-all duration-200 text-sm"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content with dynamic width */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: rightPanelWidth + 'px' }}>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Welcome message when no messages */}
            {messages.length === 0 && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-sm border border-cyan-500/20 flex items-center justify-center">
                    <Brain className="w-12 h-12 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-light text-white mb-3">
                    Welcome to Analysis Agent
                  </h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    I can help you with biomedical research, data analysis, protocol generation, and scientific computing.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto mb-8">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-cyan-400 mb-2">Example Questions</h3>
                    <ul className="space-y-2 text-left">
                      <li className="text-sm text-gray-400">• Plot survival curves</li>
                      <li className="text-sm text-gray-400">• Design CRISPR experiment</li>
                      <li className="text-sm text-gray-400">• Analyze gene expression</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-cyan-400 mb-2">Capabilities</h3>
                    <ul className="space-y-2 text-left">
                      <li className="text-sm text-gray-400">• Protocol generation</li>
                      <li className="text-sm text-gray-400">• Data visualization</li>
                      <li className="text-sm text-gray-400">• Code execution</li>
                    </ul>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500">
                  Type your question below to get started
                </p>
              </motion.div>
            )}
            
            {/* Messages */}
            {messages.map(message => (
              <motion.div 
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20' 
                    : 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20'
                } backdrop-blur-sm rounded-lg p-4`}
              >
                <div className="flex items-start space-x-3">
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !className || !match
                            return !isInline && match ? (
                              <pre className="bg-black/50 backdrop-blur-sm text-gray-100 p-3 rounded-lg overflow-x-auto border border-white/10">
                                <code className={`language-${match[1]}`} {...props}>
                                  {String(children).replace(/\n$/, '')}
                                </code>
                              </pre>
                            ) : (
                              <code className="bg-white/10 px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            )
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Display images if present using ImageDisplay component */}
                    {message.images && message.images.length > 0 && (
                      <div className="mt-4">
                        <ImageDisplay images={message.images} title="Generated Visualizations" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Current streaming message */}
            {isProcessing && currentStreamingMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm animate-pulse">B</span>
                  </div>
                  <div className="flex-1 prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentStreamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing indicator */}
            {isProcessing && !currentStreamingMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-300">
                      Launching workflow executor... 🧠
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with glass morphism */}
          <div className="border-t border-white/10 p-4 bg-white/5 backdrop-blur-xl">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                title="Upload files"
              >
                <Upload className="w-5 h-5" />
              </button>
              
              {/* Model Selector Dropdown - AIDEV-NOTE: Toggle between GPT4.1 and Claude Sonnet 4 */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'GPT4.1' | 'Sonnet-4')}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white backdrop-blur-sm text-sm"
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
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Ask a biomedical question..."
                  className="w-full px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm resize-none placeholder-gray-500"
                  disabled={isProcessing}
                  rows={Math.min(5, Math.max(1, input.split('\n').length))}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              </div>
              {isProcessing ? (
                <button
                  onClick={stopProcessing}
                  className="p-2 bg-red-500/80 backdrop-blur-sm text-white rounded-md hover:bg-red-600/80 transition-colors"
                  title="Stop processing"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-md hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
                  disabled={!input.trim()}
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-white/10 hover:bg-cyan-400/50 cursor-col-resize transition-colors absolute h-full flex items-center justify-center"
          style={{ right: rightPanelWidth + 'px' }}
          onMouseDown={() => setIsResizing(true)}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Right Panel with glass morphism */}
        <div 
          className="bg-white/5 backdrop-blur-xl border-l border-white/10 overflow-y-auto absolute right-0 h-full flex flex-col"
          style={{ width: rightPanelWidth + 'px' }}
        >
          {/* Right Panel Header */}
          <div className="px-4 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10 flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-medium text-gray-300">Execution Details</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('markdown')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'markdown' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:bg-white/10'
                }`}
                title="Markdown view"
              >
                <FileMarkdown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'json' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:bg-white/10'
                }`}
                title="JSON view"
              >
                <FileJson className="w-4 h-4" />
              </button>
              {viewMode === 'json' && (
                <button
                  onClick={copyJsonToClipboard}
                  className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
                  title="Copy JSON"
                >
                  {copiedJson ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {viewMode === 'markdown' ? (
              // Markdown View
              <div className="space-y-4">
                {/* Show welcome info when no activity */}
                {statusSteps.every(s => s.status === 'pending') && todos.length === 0 && executionEvents.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h4 className="text-gray-400 font-medium mb-2">No Activity Yet</h4>
                    <p className="text-sm text-gray-500">
                      Execution details will appear here when you start a task
                    </p>
                  </div>
                )}
                
                {/* Status Steps */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-300">Status</h4>
                  {statusSteps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'active' ? 'bg-cyan-500' :
                        'bg-gray-600'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3 text-white" />
                        ) : step.status === 'active' ? (
                          <Loader className="w-3 h-3 text-white animate-spin" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm ${
                          step.status !== 'pending' ? 'text-gray-100' : 'text-gray-500'
                        }`}>
                          {step.icon} {step.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Todo List */}
                {todos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Tasks</h4>
                    <div className="space-y-2">
                      {todos.map((todo) => (
                        <div key={todo.id} className="flex items-start space-x-2">
                          <span className="text-sm text-gray-500">{todo.id}.</span>
                          <div className="flex items-start space-x-2 flex-1">
                            {todo.completed && <span className="text-green-400 text-sm">✓</span>}
                            <span className={`text-sm ${
                              todo.completed ? 'text-green-400 line-through' : 'text-gray-300'
                            }`}>
                              {todo.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Events */}
                {executionEvents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-300">Execution Log</h4>
                    {executionEvents.map((event, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`rounded-md p-3 backdrop-blur-sm border ${
                          event.type === 'reasoning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                          event.type === 'planning' ? 'bg-blue-500/10 border-blue-500/20' :
                          event.type === 'tool_call' ? 'bg-green-500/10 border-green-500/20' :
                          event.type === 'observation' ? 'bg-purple-500/10 border-purple-500/20' :
                          event.type === 'visualization' ? 'bg-pink-500/10 border-pink-500/20' :
                          event.type === 'final_protocol' ? 'bg-cyan-500/10 border-cyan-500/20' :
                          'bg-gray-500/10 border-gray-500/20'
                        }`}
                      >
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleEventExpansion(index)}
                        >
                          <div className="flex items-center space-x-2">
                            {event.type === 'reasoning' && <Brain className="w-4 h-4 text-yellow-400" />}
                            {event.type === 'planning' && <List className="w-4 h-4 text-blue-400" />}
                            {event.type === 'tool_call' && <Code className="w-4 h-4 text-green-400" />}
                            {event.type === 'observation' && <Eye className="w-4 h-4 text-purple-400" />}
                            {event.type === 'visualization' && <Image className="w-4 h-4 text-pink-400" />}
                            {event.type === 'final_protocol' && <FileText className="w-4 h-4 text-cyan-400" />}
                            <span className="font-medium text-sm capitalize text-gray-200">
                              {event.type.replace('_', ' ')}
                            </span>
                          </div>
                          {event.content && event.content.length > 50 && (
                            event.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                        
                        {event.content && (
                          <div className={`mt-2 text-xs text-gray-300 ${
                            !event.expanded && event.content.length > 100 ? 'line-clamp-2' : ''
                          }`}>
                            {event.type === 'tool_call' ? (
                              <pre className="whitespace-pre-wrap font-mono bg-black/30 p-2 rounded">
                                <code className="language-python">{event.content}</code>
                              </pre>
                            ) : (
                              <pre className="whitespace-pre-wrap font-mono">{event.content}</pre>
                            )}
                          </div>
                        )}
                        
                        {/* Always show images for visualization events */}
                        {event.type === 'visualization' && event.metadata?.images && (
                          <div className="mt-3">
                            <ImageDisplay 
                              images={event.metadata.images} 
                              title={event.metadata.caption || 'Generated Plots'} 
                            />
                          </div>
                        )}
                        
                        {event.type === 'visualization' && event.metadata?.imageUrl && !event.metadata?.images && (
                          <div className="mt-2">
                            <img 
                              src={event.metadata.imageUrl} 
                              alt={event.metadata.caption || 'Visualization'}
                              className="w-full rounded border border-white/10"
                            />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // JSON View
              <div className="bg-black/50 backdrop-blur-sm text-gray-100 p-4 rounded-lg border border-white/10">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify({
                    statusSteps,
                    todos,
                    executionEvents: executionEvents.map(e => ({
                      type: e.type,
                      content: e.content?.substring(0, 100) + (e.content && e.content.length > 100 ? '...' : ''),
                      timestamp: e.timestamp,
                      metadata: e.metadata
                    })),
                    messages: messages.map(m => ({
                      role: m.role,
                      contentLength: m.content.length,
                      hasSolution: !!m.solution,
                      hasImages: !!(m.images && m.images.length > 0),
                      timestamp: m.timestamp
                    }))
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div ref={rightPanelEndRef} />
        </div>
      </div>
      
      {/* Message Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-3">Conversation Limit Reached</h2>
            <p className="text-gray-300 mb-6">
              You've reached the message limit for this conversation. Please start a new conversation to continue.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setMessages([])
                  setMessageCount(0)
                  setShowLimitModal(false)
                  setInput('')
                  setTodos([])
                  setExecutionEvents([])
                  setActiveModel(null) // AIDEV-NOTE: Reset active model indicator
                  toast.success('New conversation started!', { icon: '🆕' })
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200"
              >
                Start New Conversation
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default AnalysisAgentUltra