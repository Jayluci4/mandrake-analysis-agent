// AIDEV-NOTE: Complete Biomni Agent with Glass Morphism Design
// Beautiful dual panel design from AnalysisAgentUltra + Enhanced file management
import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { ErrorInfo } from 'react'
import { motion } from 'framer-motion'
import {
  Home, GripVertical, Copy, Check,
  Activity, Download, RefreshCw,
  Microscope, Upload, FileText, X, Send, Settings,
  Code, Target, ChevronRight, CheckCircle, Image,
  Maximize2, ArrowDown
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import toast from 'react-hot-toast'
import { generateMultiplePlots } from '../services/mockImageGenerator'
import { ImageDisplay } from '../components/ImageDisplay'
import FileManager, { useBiomniFileManager } from '../components/FileManager'
import MessageBubble from '../components/MessageBubble'
import StatusIndicator from '../components/StatusIndicator'
import { useBiomniAgent } from '../hooks/useBiomniAgent'
import TopNavigation from '../components/TopNavigation'
import FileManagerModal from '../components/FileManagerModal'
import ConversationHistory from '../components/ConversationHistory'
import { GoogleLogin } from '../components/GoogleLogin'
import { useGoogleAuth } from '../context/GoogleAuthContext'

// AIDEV-NOTE: Enhanced interfaces with file management
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



interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// SECURITY: Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<any> }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} errorInfo={this.state.errorInfo} />
    }

    return this.props.children
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error | null; errorInfo: ErrorInfo | null }> = ({ error }) => (
  <div className="min-h-screen bg-[#0f0e1d] text-white flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6 backdrop-blur-xl">
      <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
      <p className="text-red-300 mb-4">
        The application encountered an unexpected error. Please refresh the page or contact support.
      </p>
      {error && (
        <details className="text-[13.5px] text-red-200 bg-red-500/5 p-3 rounded border border-red-500/20">
          <summary className="cursor-pointer font-medium">Error Details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">{error.toString()}</pre>
        </details>
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 w-full py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
)

const BiomniCompleteGlass: React.FC = () => {
  const navigate = useNavigate()
  
  // Use custom hook for state management
  const {
    messages,
    setMessages,
    input,
    setInput,
    isProcessing,
    setIsProcessing,
    todos,
    setTodos,
    executionEvents,
    setExecutionEvents,
    currentStreamingMessage,
    setCurrentStreamingMessage,
    generatedImages,
    setGeneratedImages,
    backendUrl,
    setBackendUrl,
    connectionStatus,
    setConnectionStatus,
    selectedModel,
    setSelectedModel,
    activeModel,
    setActiveModel,
    uploadedFiles,
    setUploadedFiles,
    isUploading,
    uploadProgress,
    messageCount,
    setMessageCount,
    showLimitModal,
    setShowLimitModal,
    eventSourceRef,
    handleFileUpload,
    removeUploadedFile,
    stopProcessing,
    startNewSession,
    addLog,
    updateStatusStep
  } = useBiomniAgent()

  // Local UI state
  const [statusSteps, setStatusSteps] = useState<StatusStep[]>([])
  const [rightPanelWidth, setRightPanelWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  // AIDEV-NOTE: Persist session across page refreshes
  const getPersistedSessionId = () => {
    const persisted = localStorage.getItem('currentSessionId')
    return persisted || `glass_session_${Date.now()}`
  }
  const [sessionId] = useState(getPersistedSessionId)
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileValidationErrors, setFileValidationErrors] = useState<string[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [showFileManagerModal, setShowFileManagerModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState(sessionId)

  // AIDEV-NOTE: Update localStorage whenever currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId)
    }
  }, [currentSessionId])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [currentQueryImages, setCurrentQueryImages] = useState<string[]>([])  // AIDEV-NOTE: Track images for current query only
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Authentication credentials (PHASE 1: Hardcoded for development)
  const [authCredentials] = useState({
    username: 'guest',
    password: 'demo2024'
  })
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const rightPanelEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Enhanced file manager
  const fileManager = useBiomniFileManager()

  // Enhanced logging function
  const enhancedAddLog = useCallback((message: string) => {
    addLog(message)
  }, [addLog])

  // PHASE 2: Load generated images for gallery only (don't affect current query)
  const loadGeneratedImages = async () => {
    if (!backendUrl) return

    try {
      const response = await fetch(`${backendUrl}/images`)
      // Images endpoint doesn't require auth currently
      if (response.ok) {
        const data = await response.json()
        enhancedAddLog(`🖼️ Loaded ${data.images?.length || 0} generated images`)

        // CRITICAL FIX: Only update gallery, don't interfere with current query images
        const imageUrls = (data.images || []).map((img: any) => `${backendUrl}${img.image_url}`)

        // Update gallery without affecting current query
        setGeneratedImages(imageUrls)  // Replace entirely, don't accumulate

        return data.images || []
      }
    } catch (e) {
      handleError(e as Error, 'Image Loading')
      enhancedAddLog(`⚠️ Failed to load images: ${e}`)
    }
    return []
  }

  // PERFORMANCE: Memoized error handling functions
  const handleError = useCallback((error: Error, context: string) => {
    console.error(`Error in ${context}:`, error)
    setNetworkError(`${context}: ${error.message}`)
    enhancedAddLog(`❌ Error in ${context}: ${error.message}`)
  }, [enhancedAddLog])

  // PERFORMANCE: Memoized retry mechanism
  const retryOperation = useCallback(async (operation: () => Promise<any>, maxRetries = 3) => {
    let attempts = 0
    while (attempts < maxRetries) {
      try {
        setIsRetrying(attempts > 0)
        const result = await operation()
        setNetworkError(null)
        setRetryCount(0)
        setIsRetrying(false)
        return result
      } catch (error) {
        attempts++
        setRetryCount(attempts)
        if (attempts >= maxRetries) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)) // Exponential backoff
      }
    }
  }, [])

  // Toggle execution event expansion
  const toggleEventExpansion = (index: number) => {
    setExecutionEvents(prev => prev.map((event, i) =>
      i === index ? { ...event, expanded: !event.expanded } : event
    ))
  }

  // AIDEV-NOTE: Scientific data extraction from backend events
  const extractScientificData = (content: string, eventData: any): any => {
    const scientificData: any = {}

    // Extract molecular weight from content
    const molWeightMatch = content.match(/Molecular Weight[:\s]*(\d+(?:\.\d+)?)\s*(g\/mol|Da)/i)
    if (molWeightMatch) {
      scientificData.molecular_properties = {
        molecular_weight: parseFloat(molWeightMatch[1])
      }
    }

    // Extract SMILES from content
    const smilesMatch = content.match(/SMILES[:\s]*([A-Za-z0-9\(\)\[\]@=#\-\+\\\/]+)/i)
    if (smilesMatch) {
      if (!scientificData.molecular_properties) scientificData.molecular_properties = {}
      scientificData.molecular_properties.smiles = smilesMatch[1]
    }

    // Extract measurements
    const measurementMatches = content.matchAll(/(\d+(?:\.\d+)?)\s*(g\/mol|bp|kb|mb|μL|mL|μg|mg|°C|Å²)/gi)
    const measurements = Array.from(measurementMatches).map(match => ({
      value: parseFloat(match[1]),
      unit: match[2]
    }))
    if (measurements.length > 0) {
      scientificData.measurements = measurements
    }

    // Extract DNA/protein sequences
    const dnaSeqs = content.match(/[ATCGRYSWKMBDHVN]{20,}/g)
    const proteinSeqs = content.match(/[ACDEFGHIKLMNPQRSTVWY]{10,}/g)

    if (dnaSeqs) {
      scientificData.dna_sequences = dnaSeqs.map(seq => ({
        sequence: seq,
        length: seq.length,
        type: 'dna'
      }))
    }

    if (proteinSeqs) {
      scientificData.protein_sequences = proteinSeqs.map(seq => ({
        sequence: seq,
        length: seq.length,
        type: 'protein'
      }))
    }

    // Extract database results
    if (content.includes('query_info') || content.includes('endpoint') || content.includes('KEGG') || content.includes('UniProt')) {
      try {
        const dbMatch = content.match(/\{'success'[^}]+\}/g)
        if (dbMatch) {
          const parsed = JSON.parse(dbMatch[0])
          if (parsed.success && parsed.query_info) {
            scientificData.database_results = {
              source: parsed.query_info.description || 'Database Query',
              query: parsed.query_info.endpoint || '',
              results: [parsed.result?.raw_text || parsed.result || 'No results']
            }
          }
        }
      } catch (e) {
        // Silent fail for database parsing
      }
    }

    // Use backend scientific_data if available
    if (eventData.scientific_data) {
      Object.assign(scientificData, eventData.scientific_data)
    }

    return Object.keys(scientificData).length > 0 ? scientificData : undefined
  }

  // Server-side conversation management
  const saveCurrentConversation = async () => {
    if (!backendUrl || !currentSessionId) return

    if (messages.length > 0 || executionEvents.length > 0 || todos.length > 0) {
      try {
        // Get stored title or generate from first message
        let conversationTitle = sessionStorage.getItem(`title_${currentSessionId}`)
        if (!conversationTitle && messages.length > 0) {
          const firstUserMessage = messages.find(m => m.role === 'user')
          if (firstUserMessage) {
            conversationTitle = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
            sessionStorage.setItem(`title_${currentSessionId}`, conversationTitle)
          }
        }
        if (!conversationTitle) {
          conversationTitle = `Research Session ${currentSessionId.split('_').pop()}`
        }

        const currentTime = new Date().toISOString()
        const response = await fetch(`${backendUrl}/conversations/${currentSessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Conversation saving doesn't require auth currently
          body: JSON.stringify({
            messages: messages,
            events: executionEvents,
            todos: todos,
            title: conversationTitle,
            created_at: messages.length > 0 ? messages[0].timestamp.toISOString() : currentTime,
            updated_at: currentTime,
            message_count: messages.length,
            model_used: selectedModel
          })
        })

        if (response.ok) {
          enhancedAddLog(`💾 Conversation auto-saved: ${currentSessionId}`)
        }
      } catch (e) {
        enhancedAddLog(`⚠️ Failed to save conversation: ${e}`)
      }
    }
  }

  const loadConversationsFromServer = async () => {
    if (!backendUrl) return

    setIsLoadingConversations(true)
    try {
      const response = await fetch(`${backendUrl}/conversations`)
      // Conversations endpoint doesn't require auth currently
      if (response.ok) {
        const data = await response.json()
        setConversationHistory(data.conversations || [])
        enhancedAddLog(`📚 Loaded ${data.conversations?.length || 0} saved conversations`)
      }
    } catch (e) {
      enhancedAddLog(`⚠️ Failed to load conversations: ${e}`)
    }
    setIsLoadingConversations(false)
  }

  const startNewConversation = async () => {
    // Save current conversation first
    await saveCurrentConversation()

    // Generate new session
    const newSessionId = `glass_session_${Date.now()}`
    setCurrentSessionId(newSessionId)
    localStorage.setItem('currentSessionId', newSessionId)  // Persist new session

    // Clear current conversation
    setMessages([])
    setExecutionEvents([])
    setTodos([])
    setCurrentStreamingMessage('')
    setIsProcessing(false)
    setCurrentQueryImages([])  // AIDEV-NOTE: Clear query-specific images
    setUploadedFiles([])
    setMessageCount(0)

    enhancedAddLog(`🔄 Started new conversation: ${newSessionId}`)
    toast.success('New conversation started', { icon: '🆕' })

    // Refresh conversation list
    await loadConversationsFromServer()
  }

  // AIDEV-NOTE: Export conversation as markdown
  const exportConversation = () => {
    let markdown = `# Conversation Export\n\n`
    markdown += `**Session ID:** ${currentSessionId}\n`
    markdown += `**Date:** ${new Date().toLocaleString()}\n`
    markdown += `**Model:** ${selectedModel}\n\n`
    markdown += `---\n\n`

    messages.forEach((message) => {
      markdown += `### ${message.role === 'user' ? '👤 User' : '🤖 Assistant'}\n`
      markdown += `*${message.timestamp.toLocaleString()}*\n\n`
      markdown += `${message.content}\n\n`
      markdown += `---\n\n`
    })

    // Add execution events summary
    if (executionEvents.length > 0) {
      markdown += `## Execution Log\n\n`
      executionEvents.forEach((event) => {
        markdown += `- **${event.type}**: ${event.content || event.observation || 'N/A'}\n`
      })
    }

    // Create downloadable blob
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation_${currentSessionId}_${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Conversation exported', { icon: '📥' })
  }

  // AIDEV-NOTE: Clear current conversation without starting new session
  const clearConversation = () => {
    if (messages.length === 0 && executionEvents.length === 0) {
      toast.info('Conversation is already empty', { icon: 'ℹ️' })
      return
    }

    // Clear all conversation data
    setMessages([])
    setExecutionEvents([])
    setTodos([])
    setCurrentStreamingMessage('')
    setIsProcessing(false)
    setCurrentQueryImages([])
    setUploadedFiles([])
    setGeneratedImages([])
    setMessageCount(0)

    enhancedAddLog(`🧹 Cleared conversation: ${currentSessionId}`)
    toast.success('Conversation cleared', { icon: '🧹' })
  }

  const loadConversation = async (sessionId: string) => {
    if (!backendUrl) {
      console.error('No backend URL available')
      return
    }

    console.log('🔍 Starting to load conversation:', sessionId)
    console.log('Backend URL:', backendUrl)

    // Save current conversation first (safe now with loading flag)
    await saveCurrentConversation()

    setIsLoadingConversations(true)
    setIsLoadingConversation(true) // AIDEV-NOTE: Prevent auto-save during loading
    try {
      const url = `${backendUrl}/conversations/${sessionId}`
      console.log('📡 Fetching from:', url)

      const response = await fetch(url)
      console.log('📊 Response status:', response.status, response.ok)

      // Conversation loading doesn't require auth currently
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Raw data from backend:', JSON.stringify(data, null, 2))

        if (data.success) {
          // Update session ID and persist
          console.log('✅ Setting new session ID:', sessionId)
          setCurrentSessionId(sessionId)
          localStorage.setItem('currentSessionId', sessionId)

          // CRITICAL FIX: Convert timestamp strings to Date objects to prevent rendering issues
          const messages = (data.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          console.log('📝 Processed messages count:', messages.length)
          console.log('📝 First message:', messages[0])

          // AIDEV-NOTE: Backend returns 'events', not 'execution_events'
          const events = (data.events || []).map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp)
          }))
          console.log('⚡ Processed events count:', events.length)
          console.log('⚡ First event:', events[0])

          // Set all state - this is the critical part
          console.log('🔄 Setting state - messages:', messages.length, 'events:', events.length, 'todos:', data.todos?.length || 0)

          setMessages(messages)
          setExecutionEvents(events)
          setTodos(data.todos || [])
          setMessageCount(messages.length)

          // Verify state was set
          console.log('✅ State update triggered')

          // AIDEV-NOTE: Restore images from execution events
          const restoredImages: string[] = []
          events.forEach((event: any) => {
            if (event.images && Array.isArray(event.images)) {
              restoredImages.push(...event.images)
            }
          })

          if (restoredImages.length > 0) {
            console.log('🖼️ Restoring images:', restoredImages.length)
            setGeneratedImages(restoredImages)
            setCurrentQueryImages(restoredImages)
          } else {
            setCurrentQueryImages([])  // Clear if no images to restore
          }

          enhancedAddLog(`📚 Loaded conversation: ${sessionId} (${messages.length} messages, ${events.length} events)`)
          toast.success(`Loaded: ${messages.length} messages, ${events.length} events`, { icon: '📚' })

          setIsLoadingConversation(false) // AIDEV-NOTE: Re-enable auto-save after successful load
        } else {
          console.error('❌ Backend returned success: false', data)
          toast.error('Failed: No success flag from backend', { icon: '❌' })
        }
      } else {
        console.error('❌ Response not OK:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response body:', errorText)
        toast.error(`Failed: HTTP ${response.status}`, { icon: '❌' })
      }
    } catch (e) {
      console.error('💥 Exception loading conversation:', e)
      enhancedAddLog(`⚠️ Failed to load conversation: ${e}`)
      toast.error(`Failed to load conversation`, { icon: '❌' })
    }
    setIsLoadingConversations(false)
    setIsLoadingConversation(false) // AIDEV-NOTE: Re-enable auto-save
  }

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if click is outside the settings dropdown container
      if (showSettingsDropdown && !target.closest('.settings-dropdown-container')) {
        setShowSettingsDropdown(false)
      }
    }

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettingsDropdown])


  // SECURITY: Comprehensive file validation
  const validateFile = (file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // File size limits (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" exceeds 10MB limit`)
    }

    // BIOMEDICAL RESEARCH: Comprehensive MIME type validation for research labs
    const ALLOWED_TYPES = {
      // Basic data formats
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/json': ['.json'],
      'text/plain': ['.txt', '.md', '.fasta', '.fa', '.fastq', '.fq', '.gbk', '.gb', '.bed', '.gff', '.gtf', '.pdb', '.sdf', '.mol', '.xyz', '.py', '.r', '.sh'],
      'text/markdown': ['.md'],

      // Sequence formats
      'chemical/x-fasta': ['.fasta', '.fa'],
      'chemical/x-genbank': ['.gbk', '.gb'],
      'application/x-fasta': ['.fasta', '.fa'],
      'chemical/x-pdb': ['.pdb'],
      'chemical/x-mol': ['.mol', '.sdf'],

      // Images & microscopy
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tiff', '.tif'],

      // Microsoft Office
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf'],

      // Archives
      'application/zip': ['.zip'],
      'application/x-gzip': ['.gz'],
      'application/x-tar': ['.tar'],
      'application/x-7z-compressed': ['.7z'],

      // Specialized
      'application/x-hdf': ['.h5', '.hdf5'],
      'application/x-sqlite3': ['.sqlite', '.db'],

      // Empty MIME type fallback for research files (browsers often don't recognize specialized formats)
      '': ['.fasta', '.fa', '.fastq', '.fq', '.pdb', '.sdf', '.mol', '.xyz', '.gbk', '.gb',
           '.bed', '.gff', '.gtf', '.vcf', '.sam', '.bam', '.wig', '.bigwig', '.ab1',
           '.mzml', '.mzxml', '.fcs', '.cel', '.idat', '.sra', '.czi', '.lsm', '.nd2',
           '.tsv', '.h5', '.hdf5', '.pkl', '.pickle', '.ipynb', '.py', '.r', '.m',
           '.yaml', '.yml', '.dicom', '.tiff', '.tif']
    }

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    let mimeType = file.type || ''  // Handle undefined MIME type

    // Special handling for files without MIME type (common browser issue)
    // Include markdown and other text files that browsers often fail to identify
    const allowedExtensionsWithoutMime = [
      '.md', '.markdown', '.txt', '.csv', '.tsv', '.json',  // Common text formats
      '.fasta', '.fa', '.fastq', '.fq', '.pdb', '.sdf', '.mol', '.xyz',  // Biomedical formats
      '.gbk', '.gb', '.bed', '.gff', '.gtf', '.vcf', '.mzml',
      '.fcs', '.cel', '.h5', '.hdf5', '.pkl', '.ipynb', '.yaml', '.yml'
    ]

    if (mimeType === '' && allowedExtensionsWithoutMime.includes(fileExtension)) {
      // These files are allowed even with empty MIME type
      // Assign a default MIME type based on extension for better handling
      if (fileExtension === '.md' || fileExtension === '.markdown') {
        mimeType = 'text/markdown'
      } else if (fileExtension === '.csv') {
        mimeType = 'text/csv'
      } else if (fileExtension === '.json') {
        mimeType = 'application/json'
      } else {
        mimeType = 'text/plain'  // Default for other text-based formats
      }
    }

    // Check if MIME type is allowed
    if (!Object.keys(ALLOWED_TYPES).includes(mimeType)) {
      errors.push(`File type "${mimeType}" not allowed for "${file.name}"`)
    }

    // Verify extension matches MIME type
    const allowedExtensions = ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES]
    if (allowedExtensions && !allowedExtensions.includes(fileExtension)) {
      // Skip this error for markdown files as browsers inconsistently report their MIME type
      if (fileExtension !== '.md' && fileExtension !== '.markdown') {
        errors.push(`File extension "${fileExtension}" doesn't match type "${mimeType}"`)
      }
    }

    // File name validation (prevent path traversal)
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      errors.push(`Invalid file name: "${file.name}"`)
    }

    return { isValid: errors.length === 0, errors }
  }

  // SECURITY: Enhanced file upload with validation
  const secureHandleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadError(null)
    setFileValidationErrors([])

    if (files.length === 0) return

    // Validate all files first
    const allErrors: string[] = []
    const validFiles: File[] = []

    for (const file of files) {
      const validation = validateFile(file)
      if (validation.isValid) {
        validFiles.push(file)
      } else {
        allErrors.push(...validation.errors)
      }
    }

    // Show validation errors
    if (allErrors.length > 0) {
      setFileValidationErrors(allErrors)
      toast.error(`File validation failed: ${allErrors.length} errors`, { icon: '🚫' })
      return
    }

    // Proceed with upload only if all files are valid
    if (validFiles.length > 0) {
      try {
        await handleFileUpload(event)
        enhancedAddLog(`✅ Successfully validated and uploaded ${validFiles.length} files`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
        setUploadError(errorMessage)
        toast.error(`Upload failed: ${errorMessage}`, { icon: '❌' })
      }
    }

    // Clear the input
    event.target.value = ''
  }

  // SECURITY: Input sanitization and XSS prevention
  const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous HTML tags and scripts
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick, onload, etc.
  }

  // SECURITY: Safe JSON stringification
  const safeJsonStringify = (obj: any): string => {
    try {
      return JSON.stringify(obj, (_key, value) => {
        // Sanitize string values
        if (typeof value === 'string') {
          return sanitizeInput(value)
        }
        return value
      }, 2)
    } catch (error) {
      return `{"error": "Failed to serialize data safely"}`
    }
  }

  // Note: Authentication is now handled via query parameters for EventSource compatibility
  // The credentials are embedded in the SSE URL for the chat endpoint

  // Enhanced send message with file management
  const sendMessage = async () => {
    if (!input.trim() || isProcessing || !backendUrl) return

    if (messageCount >= 5) {
      setShowLimitModal(true)
      toast.error('Message limit reached', { icon: '⚠️' })
      return
    }

    // Generate conversation title from first message
    if (messages.length === 0) {
      // Create a descriptive title from the user's query
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '')
      // Store the title for this session
      sessionStorage.setItem(`title_${currentSessionId}`, title)
    }

    // Enhanced message with file context
    let enhancedContent = input

    // Add uploaded file context to the message
    if (uploadedFiles.length > 0) {
      const fileNames = uploadedFiles.map(f => f.name).join(', ')
      enhancedContent = `${input}\n\n📎 Uploaded files: ${fileNames}\nNote: These files are available in the backend directory for analysis.`
      enhancedAddLog(`📎 Including ${uploadedFiles.length} uploaded files in query context`)
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: enhancedContent,
      timestamp: new Date(),
      files: uploadedFiles
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)
    setMessageCount(prev => prev + 1)
    setCurrentStreamingMessage('')
    // CRITICAL FIX: Clear only current query images, not all historical images
    setCurrentQueryImages([])  // Reset images for this specific query
    // Don't clear generatedImages - keep for right panel gallery
    // CRITICAL FIX: Don't clear execution events and todos - preserve right panel data
    // setExecutionEvents([])  // REMOVED - keeps execution history
    // setTodos([])           // REMOVED - keeps todo history
    fileManager.clearFiles()

    // Clear uploaded files from UI after sending
    setUploadedFiles([])

    // Enhanced status steps
    setStatusSteps([
      { icon: '🚀', text: 'Biomni agent launched', status: 'active' },
      { icon: '🔍', text: 'Retrieving resources...', status: 'pending' },
      { icon: '🤖', text: 'Starting enhanced agent...', status: 'pending' },
      { icon: '🧠', text: 'Advanced reasoning...', status: 'pending' },
      { icon: '📋', text: 'Strategic planning...', status: 'pending' },
      { icon: '⚡', text: 'Executing with metadata...', status: 'pending' },
      { icon: '📊', text: 'Processing results...', status: 'pending' },
      { icon: '📁', text: 'Managing files...', status: 'pending' },
      { icon: '✅', text: 'Complete', status: 'pending' }
    ])

    try {
      // Enhanced URL with file information and current session
      let url = `${backendUrl}/api/chat/intelligent?message=${encodeURIComponent(userMessage.content)}&session_id=${currentSessionId}&model=${selectedModel}`

      // Add conversation context for awareness (last 3 messages)
      const recentMessages = messages.slice(-3).map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 200) // Truncate long messages
      }))

      // Add execution context (current todos and recent events)
      const executionContext = {
        todos: todos.map(t => ({ id: t.id, text: t.text, completed: t.completed })),
        recentEvents: executionEvents.slice(-5).map(e => ({ type: e.type, content: e.content?.substring(0, 100) }))
      }

      if (recentMessages.length > 0 || todos.length > 0 || executionEvents.length > 0) {
        const contextData = {
          messages: recentMessages,
          execution: executionContext
        }
        url += `&context=${encodeURIComponent(JSON.stringify(contextData))}`
        enhancedAddLog(`🧠 Added context: ${recentMessages.length} messages, ${todos.length} todos, ${executionEvents.slice(-5).length} events`)
      }

      // Add uploaded file information as URL parameters
      if (uploadedFiles.length > 0) {
        const fileParams = uploadedFiles.map(f => `files=${encodeURIComponent(f.name)}`).join('&')
        url += `&${fileParams}&file_count=${uploadedFiles.length}`
        enhancedAddLog(`📎 Added ${uploadedFiles.length} file parameters to request`)
      }

      enhancedAddLog(`🧬 Connecting to: ${url.split('?')[0]}`)
      enhancedAddLog(`🤖 Using model: ${selectedModel}`)

      if (uploadedFiles.length > 0) {
        enhancedAddLog(`📎 Files in request: ${uploadedFiles.map(f => f.name).join(', ')}`)
      }

      console.log('🎨 Glass Morphism Biomni: Connecting to backend')
      console.log('🤖 Selected model:', selectedModel)
      console.log('📎 Uploaded files:', uploadedFiles)
      console.log('🔐 Using authentication for backend requests')

      // CRITICAL FIX: EventSource doesn't support custom headers
      // We need to pass auth credentials in the URL as query parameters
      const authString = btoa(`${authCredentials.username}:${authCredentials.password}`)
      url += `&auth=${authString}`

      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource
      setConnectionStatus('connected')

      let hasReceivedEvent = false
      let toolCallCount = 0

      eventSource.onopen = () => {
        enhancedAddLog('🎉 Glass morphism connection opened!')
        setCurrentStreamingMessage('Connected to Mandrake backend...')
        toast.success('🧬 Connected to Mandrake Agent successfully ', { icon: '🔗' })
      }

      const markEventReceived = () => {
        if (!hasReceivedEvent) {
          hasReceivedEvent = true
          setCurrentStreamingMessage('')
        }
      }

      eventSource.onmessage = function(event) {
        try {
          markEventReceived()
          const data = JSON.parse(event.data)

          enhancedAddLog(`📨 Event: ${data.type}`)

          // Process for file management
          fileManager.processEventForFiles(data)

          switch(data.type) {
            case 'model_info':
              setActiveModel(data.model)
              enhancedAddLog(`🤖 Backend confirmed model: ${data.model}`)

              // Show toast if model differs from selection
              if (data.model !== selectedModel) {
                toast(`Using ${data.model} (${selectedModel} unavailable)`, { icon: '⚠️' })
                enhancedAddLog(`⚠️ Model fallback: Requested ${selectedModel}, using ${data.model}`)
              } else {
                toast.success(`✅ Using ${data.model} as requested`, { icon: '🤖' })
                enhancedAddLog(`✅ Model confirmed: ${data.model}`)
              }

              setExecutionEvents(prev => [...prev, {
                type: 'model_info',
                content: `Enhanced model active: ${data.model}`,
                timestamp: new Date(),
                metadata: {
                  model: data.model,
                  requested: selectedModel,
                  source: 'glass_biomni',
                  model_match: data.model === selectedModel
                }
              }])
              break

            case 'planning':
              handlePlanningEvent(data)
              break

            case 'tool_call':
              handleToolCallEvent(data)
              break

            case 'observation':
              handleObservationEvent(data)
              break

            case 'visualization':
              handleVisualizationEvent(data)
              break

            case 'file_operation':
              handleFileOperationEvent(data)
              break

            case 'image_generation':
              handleFileOperationEvent(data)  // Same handler, detects images automatically
              break

            case 'ai_message':
              handleAiMessageEvent(data)
              break

            case 'final_answer':
              handleFinalAnswerEvent(data)
              break

            case 'done':
              handleDoneEvent()
              break

            case 'error':
              handleErrorEvent(data)
              break
          }
        } catch (e) {
          console.error('Failed to parse message:', e)
        }
      }

      // Enhanced event handlers with real-time todo updates
      const handlePlanningEvent = (data: any) => {
        updateStatusStep(4, 'active')

        if (data.steps && Array.isArray(data.steps)) {
          const newTodos = data.steps.map((step: any, index: number) => ({
            id: index + 1,
            text: typeof step === 'string' ? step : step.step || step.description || '',
            completed: step.status === 'completed'
          }))

          // Always update todos to show real-time progress
          setTodos(newTodos)

          const completedCount = newTodos.filter((t: TodoItem) => t.completed).length
          const totalCount = newTodos.length

          enhancedAddLog(`📋 Todo progress: ${completedCount}/${totalCount} completed`)

          // Create detailed todo list content for execution log
          const todoListContent = newTodos.map((todo: TodoItem) =>
            `${todo.completed ? '✅' : '⏳'} ${todo.text}`
          ).join('\n')

          setExecutionEvents(prev => [...prev, {
            type: 'planning',
            content: `Todo Progress (${completedCount}/${totalCount}):\n\n${todoListContent}`,
            timestamp: new Date(),
            expanded: true,  // Auto-expand to show todo details
            metadata: {
              steps: data.steps,
              completed: completedCount,
              total: totalCount,
              progress_percentage: Math.round((completedCount / totalCount) * 100),
              detailed_view: true
            }
          }])
        }
      }

      const handleToolCallEvent = (data: any) => {
        toolCallCount++
        updateStatusStep(5, 'active')

        const code = data.code || data.content || ''

        // CRITICAL FIX: Don't generate mock images, wait for real file operations
        if (code.includes('plt.') || code.includes('matplotlib') || code.includes('seaborn') || code.includes('plotly')) {
          setExecutionEvents(prev => [...prev, {
            type: 'visualization',
            content: 'Generating scientific plots...',
            timestamp: new Date(),
            expanded: true,
            metadata: {
              plot_detected: true,
              caption: 'Scientific Visualization in Progress',
              source: 'glass_biomni'
            }
          }])

          enhancedAddLog(`🎨 Plot generation detected in code`)
        }

        setExecutionEvents(prev => [...prev, {
          type: 'tool_call',
          content: code || 'Executing enhanced tool...',
          timestamp: new Date(),
          expanded: code.length > 0,
          metadata: {
            tool_name: data.tool_name,
            language: data.language || 'python',
            code: code,
            complexity: data.metadata?.complexity,
            variables: data.metadata?.variables_created,
            source: 'glass_biomni'
          }
        }])

        // Update todos
        if (toolCallCount <= todos.length) {
          setTodos(prev => prev.map((todo, idx) =>
            idx < toolCallCount ? { ...todo, completed: true } : todo
          ))
        }
      }

      const handleObservationEvent = (data: any) => {
        updateStatusStep(6, 'active')

        // AIDEV-NOTE: Extract scientific data from backend events
        const content = data.content || data.output || 'Enhanced observation'
        const scientificData = extractScientificData(content, data)

        setExecutionEvents(prev => [...prev, {
          type: 'observation',
          content: content,
          timestamp: new Date(),
          expanded: true,
          scientificData: scientificData,
          metadata: {
            has_errors: data.has_errors,
            has_success: data.has_success,
            source: 'glass_biomni',
            raw_scientific_data: data.scientific_data
          }
        }])
      }

      const handleVisualizationEvent = (data: any) => {
        updateStatusStep(6, 'active')

        setExecutionEvents(prev => [...prev, {
          type: 'visualization',
          content: data.content || 'Generating scientific plots...',
          timestamp: new Date(),
          expanded: true,
          metadata: {
            imageUrl: data.imageUrl,
            images: data.images || [],
            caption: data.caption || 'Scientific Visualization',
            source: 'glass_biomni'
          }
        }])

        enhancedAddLog(`📊 Visualization: ${data.caption || 'Scientific plots generated'}`)
      }

      const handleFileOperationEvent = (data: any) => {
        updateStatusStep(7, 'active')

        // CRITICAL FIX: Handle real image files - track per query
        if (data.is_image && data.filename) {
          const imageUrl = `${backendUrl}/images/${data.filename}`

          // CRITICAL FIX: Add to current query only, update gallery separately
          setCurrentQueryImages(prev => [...prev, imageUrl])  // AIDEV-NOTE: Track for current message only

          // Update gallery without duplication
          setGeneratedImages(prev => {
            if (!prev.includes(imageUrl)) {
              return [...prev, imageUrl]
            }
            return prev
          })

          setExecutionEvents(prev => [...prev, {
            type: 'image_generation',
            content: `Generated scientific image: ${data.filename}`,
            timestamp: new Date(),
            metadata: {
              filename: data.filename,
              operation: data.operation,
              file_type: 'image',
              image_url: imageUrl,
              image_path: data.file_path,
              source: 'glass_biomni'
            }
          }])

          enhancedAddLog(`🖼️ Generated image: ${data.filename}`)
        } else {
          setExecutionEvents(prev => [...prev, {
            type: 'file_operation',
            content: `File operation: ${data.operation} ${data.filename}`,
            timestamp: new Date(),
            metadata: {
              filename: data.filename,
              operation: data.operation,
              file_type: data.file_type,
              source: 'glass_biomni'
            }
          }])

          enhancedAddLog(`📁 File operation: ${data.operation} ${data.filename}`)
        }
      }

      const handleAiMessageEvent = (data: any) => {
        const content = data.content || ''

        // REMOVED: Don't generate mock images anymore, wait for real file operations
        // Matplotlib detection now handled by file operations only

        // Check for solution
        const solutionMatch = content.match(/<solution>([\s\S]*?)<\/solution>/)
        if (solutionMatch) {
          const protocol = solutionMatch[1].trim()

          setCurrentStreamingMessage('')
          updateStatusStep(8, 'completed')

          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '## 🧬 **ENHANCED BIOMNI PROTOCOL**\n\n' + protocol,
            timestamp: new Date(),
            solution: protocol,
            images: currentQueryImages.length > 0 ? currentQueryImages : undefined  // AIDEV-NOTE: Only images from current query
          }])

          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })))
        } else {
          setCurrentStreamingMessage(content)
        }

        updateStatusStep(2, 'active')
      }

      const handleFinalAnswerEvent = (data: any) => {
        let finalContent = data.content || ''

        if (finalContent && finalContent.length > 10) {
          setCurrentStreamingMessage('📋 Enhanced solution found!')
          updateStatusStep(8, 'completed')

          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '## **SOLUTION**\n\n' + finalContent,
            timestamp: new Date(),
            solution: finalContent,
            images: currentQueryImages.length > 0 ? currentQueryImages : undefined  // AIDEV-NOTE: Only images from current query
          }])

          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })))
        }
      }

      const handleDoneEvent = () => {
        enhancedAddLog('✅ Workflow complete - reloading files')

        eventSource.close()
        eventSourceRef.current = null
        setIsProcessing(false)
        setActiveModel(null)
        setConnectionStatus('ready')
        updateStatusStep(8, 'completed')

        // AIDEV-NOTE: Auto-refresh files and images for real-time tracking
        setTimeout(() => {
          loadGeneratedFiles()
          loadGeneratedImages()
          enhancedAddLog('🔄 Auto-refreshing generated files and images...')
        }, 1000)

        // Additional refresh after 3 seconds for any delayed file creation
        setTimeout(() => {
          loadGeneratedFiles()
          loadGeneratedImages()
          enhancedAddLog('🔄 Final file and image refresh check...')
        }, 3000)

        toast.success('Enhanced workflow completed!', { icon: '🧬' })
      }

      const handleErrorEvent = (data: any) => {
        setExecutionEvents(prev => [...prev, {
          type: 'error',
          content: data.content || 'Enhanced error occurred',
          timestamp: new Date(),
          metadata: { source: 'glass_biomni' }
        }])
        toast.error(data.content || 'Error occurred')
      }

      eventSource.onerror = (error) => {
        console.error('Enhanced EventSource error:', error)

        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
        }
        eventSourceRef.current = null
        setIsProcessing(false)
        setConnectionStatus('error')

        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Mandrake Agent connection error. Please check the backend server.`,
          timestamp: new Date()
        }])

        toast.error('Connection lost', { icon: '🔌' })
      }

    } catch (err) {
      console.error('Failed to connect to backend:', err)
      setIsProcessing(false)
      setConnectionStatus('error')
      toast.error('Failed to connect')
    }
  }

  // Load conversation history
  const loadConversationHistory = async () => {
    if (!backendUrl) return

    try {
      const response = await fetch(`${backendUrl}/conversations`)
      if (response.ok) {
        const data = await response.json()
        // Enhance conversations with proper titles and metadata
        const enhancedConversations = (data.conversations || []).map((conv: any) => {
          // Try to get title from sessionStorage or generate from messages
          const storedTitle = sessionStorage.getItem(`title_${conv.session_id}`)
          const firstUserMessage = conv.messages?.find((m: any) => m.role === 'user')
          const firstMessageContent = firstUserMessage?.content || ''
          const title = conv.title || storedTitle ||
                       (firstMessageContent ? firstMessageContent.slice(0, 50) + (firstMessageContent.length > 50 ? '...' : '') : '') ||
                       `Session ${conv.session_id.slice(-8)}`

          // AIDEV-NOTE: Fix date handling - backend returns 'last_activity' not 'updated_at'
          // Backend date format: "2025-10-03 11:06:09" needs conversion to ISO
          const now = new Date().toISOString()

          const parseBackendDate = (dateStr: string) => {
            if (!dateStr) return now
            // Replace space with T and add Z for UTC if not present
            const isoStr = dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z')
            try {
              return new Date(isoStr).toISOString()
            } catch (e) {
              console.error('Date parse error:', e, dateStr)
              return now
            }
          }

          const created_at = conv.created_at ? parseBackendDate(conv.created_at) :
                           (conv.messages?.[0]?.timestamp ? new Date(conv.messages[0].timestamp).toISOString() : now)
          // Use last_activity from backend, fallback to updated_at, then messages
          const updated_at = conv.last_activity ? parseBackendDate(conv.last_activity) :
                           conv.updated_at ? parseBackendDate(conv.updated_at) :
                           (conv.messages?.length > 0 ? new Date(conv.messages[conv.messages.length - 1].timestamp || now).toISOString() : now)

          return {
            ...conv,
            title,
            created_at,
            updated_at,
            message_count: conv.message_count || conv.messages?.length || 0,
            model_used: conv.model_used || selectedModel || 'Sonnet-4'
          }
        })
        setConversationHistory(enhancedConversations)
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    }
  }

  // Load data on mount and when backend URL changes
  useEffect(() => {
    if (backendUrl) {
      loadGeneratedFiles()
      loadConversationHistory()
    }
  }, [backendUrl])

  // Auto-scroll - Same as AnalysisAgentUltra
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStreamingMessage])

  // AIDEV-NOTE: Single scroll mechanism for right panel to prevent flickering
  // Uses rightPanelEndRef only - removed conflicting rightPanelScrollRef
  useEffect(() => {
    rightPanelEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionEvents])

  // AIDEV-NOTE: Debug state changes when loading conversations
  useEffect(() => {
    console.log('📊 Messages state updated:', messages.length, 'messages')
    if (messages.length > 0) {
      console.log('First message:', messages[0])
    }
  }, [messages])

  useEffect(() => {
    console.log('⚡ ExecutionEvents state updated:', executionEvents.length, 'events')
    if (executionEvents.length > 0) {
      console.log('First event:', executionEvents[0])
    }
  }, [executionEvents])

  // Handle resizing - Same as AnalysisAgentUltra
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

  // ERROR HANDLING: Enhanced backend detection with retry
  const detectBackend = async () => {
    enhancedAddLog('🔍 Detecting backend with file management...')
    setConnectionStatus('detecting')

    try {
      return await retryOperation(async () => {
        const frontendHost = window.location.hostname

        // FIXED: Priority order - external IP first now that firewall is open
        const possibleUrls = [
          `http://${frontendHost}:8000`,  // External IP (firewall opened)
          `http://localhost:8000`,        // Local fallback
          `http://${frontendHost}:3001`,  // External fallback
          `http://localhost:3001`,        // Local fallback
        ]

        for (const testUrl of possibleUrls) {
          try {
            // Browser compatibility check for AbortSignal.timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch(`${testUrl}/health`, {
              method: 'GET',
              signal: controller.signal
              // Health check doesn't require auth
            })

            clearTimeout(timeoutId)

            if (response.ok) {
              const health = await response.json()
              enhancedAddLog(`✅ Backend found: ${testUrl}`)
              enhancedAddLog(`📊 Service: ${health.service}`)

              // Check if this backend supports file upload
              try {
                const uploadTest = await fetch(`${testUrl}/upload`, {
                  method: 'OPTIONS'
                  // Upload check doesn't require auth
                })
                if (uploadTest.ok || uploadTest.status === 405) {  // 405 Method Not Allowed is OK for OPTIONS
                  addLog(`📁 Upload endpoint available at ${testUrl}`)
                } else {
                  addLog(`⚠️ Upload endpoint not available at ${testUrl}`)
                }
              } catch (e) {
                addLog(`⚠️ Could not test upload endpoint at ${testUrl}`)
              }

              setBackendUrl(testUrl)
              setConnectionStatus('ready')
              return testUrl
            }
          } catch (e) {
            addLog(`❌ ${testUrl}: Not accessible`)
          }
        }

        throw new Error('No backend endpoints are accessible')
      })
    } catch (error) {
      handleError(error as Error, 'Backend Detection')
      setConnectionStatus('error')
      return null
    }
  }

  // AIDEV-NOTE: Enhanced file management with real-time backend integration - includes images
  const loadGeneratedFiles = async () => {
    if (!backendUrl) return

    try {
      // Fetch both regular files and images
      const [filesResponse, imagesResponse] = await Promise.all([
        fetch(`${backendUrl}/files`),
        fetch(`${backendUrl}/images`)
      ])

      const allFiles = []

      // Process regular files
      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        const files = (filesData.files || []).map((file: any) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          path: file.path,
          created_at: file.created_at,
          download_url: `${backendUrl}${file.download_url}`,
          metadata: { source: 'backend', backend_dir: filesData.backend_dir }
        }))
        allFiles.push(...files)
        enhancedAddLog(`📁 Loaded ${files.length} generated files`)
      }

      // Process image files
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json()
        const images = (imagesData.images || []).map((img: any) => ({
          name: img.name,
          type: 'image' as const,
          size: img.size,
          path: img.path,
          created_at: img.created_at,
          download_url: `${backendUrl}${img.image_url}`,
          metadata: { source: 'backend', file_type: 'image' }
        }))
        allFiles.push(...images)
        enhancedAddLog(`🖼️ Loaded ${images.length} generated images`)
      }

      // Sort by creation date (newest first)
      allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      fileManager.setGeneratedFiles(allFiles)

      // CRITICAL FIX: Only add file generation event if we actually loaded new files
      const existingFileCount = fileManager.generatedFiles.length
      if (allFiles.length > 0 && allFiles.length !== existingFileCount) {
        const fileCount = allFiles.filter(f => f.type !== 'image').length
        const imageCount = allFiles.filter(f => f.type === 'image').length

        setExecutionEvents(prev => [...prev, {
          type: 'file_operation',
          content: `Generated ${allFiles.length} items (${fileCount} files, ${imageCount} images):\n${allFiles.map((f: any) => `• ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n')}`,
          timestamp: new Date(),
          expanded: false,
          metadata: {
            files: allFiles,
            total_files: fileCount,
            total_images: imageCount,
            source: 'glass_biomni'
          }
        }])
      }
    } catch (e) {
      handleError(e as Error, 'File Loading')
      enhancedAddLog(`⚠️ Failed to load files: ${e}`)
    }
  }

  // AIDEV-NOTE: Download file from backend
  // AIDEV-NOTE: downloadFile function removed - FileManager component handles downloads internally

  // Auto-detect on mount, load conversations, and restore persisted session
  useEffect(() => {
    detectBackend().then(async () => {
      loadGeneratedFiles()
      loadGeneratedImages()
      await loadConversationsFromServer()

      // AIDEV-NOTE: Restore persisted conversation if it exists
      const persistedSessionId = localStorage.getItem('currentSessionId')
      if (persistedSessionId && persistedSessionId !== currentSessionId) {
        await loadConversation(persistedSessionId)
      }
    })
  }, [])

  // Auto-save conversation on changes
  useEffect(() => {
    // AIDEV-NOTE: Don't auto-save while loading a conversation to prevent race condition
    if (!isLoadingConversation && backendUrl && currentSessionId && (messages.length > 0 || executionEvents.length > 0 || todos.length > 0)) {
      const saveTimer = setTimeout(() => {
        saveCurrentConversation()
      }, 2000) // Auto-save 2 seconds after changes

      return () => clearTimeout(saveTimer)
    }
  }, [messages, executionEvents, todos, backendUrl, currentSessionId, isLoadingConversation])

  // Save conversation before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (backendUrl && currentSessionId) {
        // Get stored title or generate from first message
        let conversationTitle = sessionStorage.getItem(`title_${currentSessionId}`)
        if (!conversationTitle && messages.length > 0) {
          const firstUserMessage = messages.find(m => m.role === 'user')
          if (firstUserMessage) {
            conversationTitle = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
          }
        }
        if (!conversationTitle) {
          conversationTitle = `Research Session ${currentSessionId.split('_').pop()}`
        }

        // Use sendBeacon for reliable saving during page unload
        const currentTime = new Date().toISOString()
        const data = JSON.stringify({
          messages: messages,
          events: executionEvents,
          todos: todos,
          title: conversationTitle,
          created_at: messages.length > 0 ? messages[0].timestamp.toISOString() : currentTime,
          updated_at: currentTime,
          message_count: messages.length,
          model_used: selectedModel
        })

        navigator.sendBeacon(
          `${backendUrl}/conversations/${currentSessionId}`,
          new Blob([data], { type: 'application/json' })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [messages, executionEvents, todos, backendUrl, currentSessionId])


  // SECURITY: Safe copy JSON with sanitization




  return (
    <ErrorBoundary>
      {/* ACCESSIBILITY: Live region for status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isProcessing && `Processing your request...`}
        {connectionStatus === 'connected' && `Connected to backend`}
        {connectionStatus === 'error' && `Connection error occurred`}
        {uploadError && `Upload error: ${uploadError}`}
        {networkError && `Network error: ${networkError}`}
      </div>

      <div className="h-screen flex flex-col bg-[#0f0e1d] text-white relative overflow-hidden">
      {/* Background gradient effects - Same as AnalysisAgentUltra */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-blue-600/5 pointer-events-none" />
      
      {/* PERFORMANCE: Optimized biomedical background animations with reduced motion support */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            .floating-animation * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
        {/* PERFORMANCE: Reduced floating elements from 6 to 3 */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`logo-${i}`}
            className="absolute floating-animation"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1180,
              rotate: 0,
              scale: 0.5 + Math.random() * 0.5
            }}
            animate={{
              y: -200,
              rotate: 360,
              transition: {
                duration: Math.random() * 25 + 15,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }
            }}
            style={{
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              perspective: 1000
            }}
          >
            <img
              src="/assets/Screenshot_2025-09-15_104043-removebg-preview.png"
              alt=""
              className="w-8 h-8 opacity-30 filter brightness-0 saturate-100 hue-rotate-180"
              style={{
                filter: 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2447%) hue-rotate(169deg) brightness(101%) contrast(101%)',
                willChange: 'transform'
              }}
              aria-hidden="true"
            />
          </motion.div>
        ))}

        {/* PERFORMANCE: Reduced microscope icons from 4 to 2 */}
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={`microscope-${i}`}
            className="absolute floating-animation"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1130,
              rotate: -10 + Math.random() * 20
            }}
            animate={{
              y: -150,
              x: Math.random() * 100 - 50,
              rotate: -10 + Math.random() * 20,
              transition: {
                duration: Math.random() * 30 + 20,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut'
              }
            }}
            style={{
              willChange: 'transform',
              backfaceVisibility: 'hidden'
            }}
          >
            <Microscope className="w-6 h-6 text-blue-400/25" aria-hidden="true" />
          </motion.div>
        ))}

        {/* PERFORMANCE: Reduced molecular nodes from 8 to 4 */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`molecule-${i}`}
            className="absolute w-2 h-2 floating-animation"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              scale: 0
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
              transition: {
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: Math.random() * 5
              }
            }}
            style={{
              willChange: 'transform, opacity'
            }}
          >
            <div className="w-full h-full bg-gradient-radial from-green-400/40 to-transparent rounded-full" />
          </motion.div>
        ))}

        {/* PERFORMANCE: Reduced activity indicators from 5 to 2 */}
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={`activity-${i}`}
            className="absolute floating-animation"
            initial={{
              x: -100,
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.8 : 800) + 100,
              rotate: 0
            }}
            animate={{
              x: typeof window !== 'undefined' ? window.innerWidth + 100 : 2020,
              rotate: 180,
              transition: {
                duration: Math.random() * 20 + 25,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }
            }}
            style={{
              willChange: 'transform'
            }}
          >
            <Activity className="w-5 h-5 text-purple-400/30" aria-hidden="true" />
          </motion.div>
        ))}

        {/* PERFORMANCE: Reduced pulsing points from 12 to 6 */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`pulse-${i}`}
            className="absolute w-1 h-1 rounded-full floating-animation"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              willChange: 'transform, opacity'
            }}
            animate={{
              scale: [1, 2, 1],
              opacity: [0.3, 0.8, 0.3],
              transition: {
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: Math.random() * 3
              }
            }}
          >
            <div className="w-full h-full bg-cyan-400/40" />
          </motion.div>
        ))}

        {/* PERFORMANCE: Reduced data particles from 15 to 8 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-0.5 h-0.5 bg-gradient-to-r from-cyan-400/40 to-blue-400/40 rounded-full floating-animation"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            animate={{
              y: -100,
              x: Math.sin(Date.now() * 0.001 + i) * 50,
              transition: {
                duration: Math.random() * 15 + 10,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }
            }}
            style={{
              willChange: 'transform'
            }}
          />
        ))}
      </div>

      {/* New Top Navigation Bar */}
      <TopNavigation
        onNewConversation={startNewConversation}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenFileManager={() => setShowFileManagerModal(true)}
        onExportConversation={exportConversation}
        onClearConversation={clearConversation}
        selectedModel={selectedModel}
        onModelChange={(model) => setSelectedModel(model)}
        connectionStatus={connectionStatus}
        activeModel={activeModel}
        isProcessing={isProcessing}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content - Same layout as AnalysisAgentUltra */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: rightPanelWidth + 'px' }}>
          <div
            ref={chatContainerRef}
            className="flex-1 p-6 space-y-4 overflow-y-auto relative"
            onScroll={(e) => {
              const container = e.currentTarget
              const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
              setShowScrollButton(!isAtBottom)
            }}
          >
            {/* Enhanced welcome message */}
         

            {messages.length === 0 && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-sm border border-cyan-500/20 flex items-center justify-center">
                    <img
                      src="/assets/Screenshot_2025-09-15_104043-removebg-preview.png"
                      alt="Mandrake Logo"
                      className="w-12 h-12"
                      style={{ filter: 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2447%) hue-rotate(169deg) brightness(101%) contrast(101%)' }}
                    />
                  </div>
                  <h2 className="text-2xl font-light text-white mb-3">
                    Welcome to the Mandrake Analysis Agent
                  </h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    What's on your mind today?
                  </p>
                </div>
              </motion.div>
            )}
            
            {/* Messages - Using extracted MessageBubble component */}
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Current streaming message - Same design */}
            {isProcessing && currentStreamingMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-[15.5px] animate-pulse">M</span>
                  </div>
                  <div className="flex-1 prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        // Prevent dangerous HTML elements
                        script: () => null,
                        iframe: () => null,
                        object: () => null,
                        embed: () => null,
                      }}
                    >
                      {sanitizeInput(currentStreamingMessage || '')}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing indicator - Using StatusIndicator component */}
            <StatusIndicator 
              isProcessing={isProcessing}
              currentStreamingMessage={currentStreamingMessage}
              connectionStatus={connectionStatus}
            />

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-32 right-8 z-30 p-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-full shadow-xl backdrop-blur-sm transition-all"
              onClick={() => {
                chatContainerRef.current?.scrollTo({
                  top: chatContainerRef.current.scrollHeight,
                  behavior: 'smooth'
                })
              }}
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5 text-cyan-400" />
            </motion.button>
          )}

          {/* Beautiful Modern Input Area */}
          <div>
            <div className="p-6">
              {/* Uploaded files section */}
              {/* Network error display with retry */}
              {networkError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 text-[15.5px] font-medium">Network Error</span>
                    {isRetrying && (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-red-300 text-[13.5px]">Retrying... ({retryCount}/3)</span>
                      </div>
                    )}
                  </div>
                  <p className="text-red-300 text-[13.5px] mb-3">{networkError}</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setNetworkError(null)
                        detectBackend()
                      }}
                      className="text-[13.5px] px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 transition-colors"
                      disabled={isRetrying}
                    >
                      Retry Connection
                    </button>
                    <button
                      onClick={() => setNetworkError(null)}
                      className="text-[13.5px] px-3 py-1 text-red-400 hover:text-red-300 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}

              {/* File validation errors */}
              {fileValidationErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-red-400 text-[15.5px] font-medium">File Validation Errors:</span>
                  </div>
                  <ul className="text-red-300 text-[13.5px] space-y-1">
                    {fileValidationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setFileValidationErrors([])}
                    className="mt-2 text-[13.5px] text-red-400 hover:text-red-300 underline"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}

              {uploadedFiles.length > 0 && (
              <motion.div
                  initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="text-[15.5px] font-medium text-gray-300">Attached Files</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                    <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group flex items-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg px-3 py-2 text-[15.5px] backdrop-blur-sm hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200"
                      >
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-300 font-medium max-w-32 truncate">{file.name}</span>
                        <button
                          onClick={() => removeUploadedFile(file.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                    ))}
                </div>
              </motion.div>
            )}

              {/* Main input container */}
              <div className="relative">
                {/* Message count indicator */}
                <div className="flex justify-end mb-2">
                  <div className="text-gray-500 text-[15.5px]">
                    {messageCount}/5 messages
                  </div>
          </div>

                {/* Message input box with integrated buttons */}
                <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".csv,.json,.txt,.fasta,.md,.png,.jpg,.jpeg"
                onChange={secureHandleFileUpload}
              />
                  
                  <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/50 transition-all duration-200 hover:bg-white/10">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        // Ctrl+Enter or Cmd+Enter to send
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          sendMessage()
                        }
                        // Escape to stop processing
                        if (e.key === 'Escape' && isProcessing) {
                          stopProcessing()
                        }
                      }}
                      placeholder="Ask any biomedical questions... (Press Ctrl+Enter to send)"
                      className="w-full px-4 pr-24 py-3 bg-transparent text-white text-[15.5px] resize-none placeholder-gray-400 focus:outline-none"
                      disabled={isProcessing || connectionStatus !== 'ready'}
                      rows={Math.min(5, Math.max(1, input.split('\n').length))}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      aria-label="Type your biomedical question here"
                      aria-describedby="input-help"
                      role="textbox"
                      aria-multiline="true"
                    />
                    <div id="input-help" className="sr-only">
                      Type your question and press Enter to send, or Shift+Enter for a new line
                    </div>
                    
                    {/* Integrated buttons inside the textarea */}
                    <div className="absolute right-2 bottom-2 flex items-center space-x-2">
                      {/* Upload button */}
              <div className="relative">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`group relative p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                    isUploading
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                  aria-label={isUploading ? 'Uploading files...' : 'Upload files'}
                  aria-describedby="upload-help"
                  type="button"
                >
                  {isUploading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="relative"
                    >
                              <Upload className="w-4 h-4" />
                    </motion.div>
                  ) : (
                            <Upload className="w-4 h-4" />
                  )}
                
                          {/* Upload progress overlay */}
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                                  r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                                  strokeDasharray={`${2 * Math.PI * 10}`}
                                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - uploadProgress / 100)}`}
                        className="text-cyan-400 transition-all duration-300"
                      />
                    </svg>
                  </div>
                )}
                        </button>

                <div id="upload-help" className="sr-only">
                  Upload biomedical files including CSV, JSON, text, FASTA, and images
                </div>

                {/* Progress text */}
                {isUploading && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                    <span className="text-[13.5px] text-cyan-400 bg-gray-900/90 px-2 py-1 rounded-md backdrop-blur-sm" aria-live="polite">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                )}
              </div>
              
                      {/* Send button */}
                <div className="relative">
              {isProcessing ? (
                <button
                  onClick={stopProcessing}
                  className="group p-2 bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-sm text-white rounded-lg hover:from-red-600/90 hover:to-red-700/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  aria-label="Stop processing current request"
                  type="button"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  className={`group p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                    !input.trim() || connectionStatus !== 'ready'
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700'
                  }`}
                  disabled={!input.trim() || connectionStatus !== 'ready'}
                  aria-label={
                    !input.trim()
                      ? 'Enter a message to send'
                      : connectionStatus !== 'ready'
                      ? 'Waiting for connection to be ready'
                      : 'Send message to Mandrake'
                  }
                  type="button"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
                      </div>
                    </div>
                    
                    {/* Character count */}
                    {input.length > 0 && (
                      <div className="absolute bottom-2 left-3 text-[13.5px] text-gray-500">
                        {input.length}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resize Handle - Same as AnalysisAgentUltra */}
        <div
          className="w-1 bg-white/10 hover:bg-cyan-400/50 cursor-col-resize transition-colors absolute h-full flex items-center justify-center"
          style={{ right: rightPanelWidth + 'px' }}
          onMouseDown={() => setIsResizing(true)}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Right Panel with enhanced file management */}
        <div 
          className="bg-white/5 backdrop-blur-xl border-l border-white/10 overflow-y-auto absolute right-0 h-full flex flex-col"
          style={{ width: rightPanelWidth + 'px' }}
        >
          {/* Enhanced Right Panel Header */}
          <div className="px-4 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10 flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-medium text-gray-300">Execution Panel</h3>
            <div className="flex items-center gap-2">

            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {/* Enhanced Execution View - Status steps removed per user request */}
            <div className="space-y-4">

                {/* Enhanced Todo List */}
                {todos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Tasks</h4>
                  <div className="space-y-2">
                    {todos.map((todo) => (
                        <div key={todo.id} className="flex items-start space-x-2">
                          <span className="text-[15.5px] text-gray-500">{todo.id}.</span>
                          <div className="flex items-start space-x-2 flex-1">
                            {todo.completed && <span className="text-green-400 text-[15.5px]">✓</span>}
                            <span className={`text-[15.5px] ${
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

                {/* Enhanced Execution Events */}
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
                          event.type === 'tool_call' ? 'bg-green-500/10 border-green-500/20' :
                          event.type === 'observation' ? (
                            event.metadata?.has_errors ? 'bg-red-500/10 border-red-500/20' : 'bg-purple-500/10 border-purple-500/20'
                          ) :
                          event.type === 'planning' ? 'bg-blue-500/10 border-blue-500/20' :
                          event.type === 'file_operation' ? 'bg-cyan-500/10 border-cyan-500/20' :
                          event.type === 'visualization' ? 'bg-pink-500/10 border-pink-500/20' :
                          event.type === 'image_generation' ? 'bg-orange-500/10 border-orange-500/20' :
                          'bg-gray-500/10 border-gray-500/20'
                        }`}
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleEventExpansion(index)}
                        >
                          <div className="flex items-center space-x-2">
                            {event.type === 'tool_call' && <Code className="w-4 h-4 text-green-400" />}
                            {event.type === 'observation' && (
                              event.metadata?.has_errors ?
                                <X className="w-4 h-4 text-red-400" /> :
                                <CheckCircle className="w-4 h-4 text-purple-400" />
                            )}
                            {event.type === 'planning' && <Target className="w-4 h-4 text-blue-400" />}
                            {event.type === 'file_operation' && <FileText className="w-4 h-4 text-cyan-400" />}
                            {event.type === 'visualization' && <Image className="w-4 h-4 text-pink-400" />}
                            {event.type === 'image_generation' && <Image className="w-4 h-4 text-orange-400" />}
                            <span className="text-[15.5px] font-medium text-gray-300 capitalize">
                              {event.type.replace('_', ' ')}
                            </span>
                            <span className="text-[13.5px] text-gray-500 ml-auto">
                              {event.timestamp.toLocaleTimeString()}
                            </span>
                            <motion.div
                              animate={{ rotate: event.expanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </motion.div>
                          </div>

                          {/* AIDEV-NOTE: Show summary when collapsed, full content when expanded */}
                          {!event.expanded && event.content && event.content.length > 50 && (
                            <div className="mt-2 text-[13.5px] text-gray-400 italic">
                              {event.content.substring(0, 80)}...
                            </div>
                          )}

                          {/* AIDEV-NOTE: Collapsible content controlled by event.expanded state */}
                          {event.expanded && (
                            <div className="mt-2 text-[13.5px] text-gray-300">
                            {event.type === 'tool_call' ? (
                              <div>
                                <pre className="whitespace-pre-wrap font-mono bg-black/30 p-2 rounded text-[13.5px] overflow-x-auto max-w-full">
                                  <code className="language-python break-words">{event.content}</code>
                                </pre>
                              </div>
                            ) : event.type === 'observation' ? (
                              <div className={`p-3 rounded-lg overflow-hidden ${
                                event.metadata?.has_errors
                                  ? 'bg-red-500/10 border border-red-500/20'
                                  : 'bg-purple-500/10 border border-purple-500/20'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    {event.metadata?.has_errors ? (
                                      <span className="text-red-400 text-[13.5px] font-medium">❌ Error</span>
                                    ) : (
                                      <span className="text-purple-400 text-[13.5px] font-medium">✅ Output</span>
                                    )}
                                  </div>

                                  {/* Copy & Download Actions */}
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(event.content || '')
                                        toast.success('Copied to clipboard', { icon: '📋' })
                                      }}
                                      className="p-1 text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                                      title="Copy observation data"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const blob = new Blob([event.content || ''], { type: 'text/plain' })
                                        const url = window.URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = `observation_${event.timestamp.getTime()}.txt`
                                        document.body.appendChild(a)
                                        a.click()
                                        window.URL.revokeObjectURL(url)
                                        document.body.removeChild(a)
                                        toast.success('Downloaded observation', { icon: '💾' })
                                      }}
                                      className="p-1 text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                                      title="Download observation data"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* AIDEV-NOTE: Scientific data display - molecular properties */}
                                {event.scientificData?.molecular_properties && (
                                  <div className="mb-3 p-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-cyan-400 text-[13.5px] font-medium">🧪 Molecular Properties</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[13.5px]">
                                      {event.scientificData.molecular_properties.molecular_weight && (
                                        <div className="bg-black/20 p-2 rounded">
                                          <span className="text-gray-400">Molecular Weight:</span>
                                          <span className="text-cyan-300 font-medium ml-1">
                                            {event.scientificData.molecular_properties.molecular_weight} g/mol
                                          </span>
                                        </div>
                                      )}
                                      {event.scientificData.molecular_properties.smiles && (
                                        <div className="bg-black/20 p-2 rounded">
                                          <span className="text-gray-400">SMILES:</span>
                                          <span className="text-cyan-300 font-mono text-[13.5px] ml-1 break-all">
                                            {event.scientificData.molecular_properties.smiles}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* AIDEV-NOTE: Measurements display */}
                                {event.scientificData?.measurements && event.scientificData.measurements.length > 0 && (
                                  <div className="mb-3 p-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-green-400 text-[13.5px] font-medium">📏 Measurements</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-[13.5px]">
                                      {event.scientificData.measurements.map((measurement: {value: number, unit: string}, idx: number) => (
                                        <div key={idx} className="bg-black/20 p-1.5 rounded text-center">
                                          <span className="text-green-300 font-medium">
                                            {measurement.value} {measurement.unit}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* AIDEV-NOTE: Sequence display */}
                                {(event.scientificData?.dna_sequences || event.scientificData?.protein_sequences) && (
                                  <div className="mb-3 p-2 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-orange-400 text-[13.5px] font-medium">🧬 Sequences</span>
                                    </div>
                                    {event.scientificData.dna_sequences?.map((seq: {sequence: string, length: number, type: string}, idx: number) => (
                                      <div key={`dna-${idx}`} className="mb-2 p-2 bg-black/20 rounded">
                                        <div className="text-orange-300 text-[13.5px] font-medium">DNA ({seq.length} bp):</div>
                                        <div className="text-orange-200 font-mono text-[13.5px] mt-1 break-all max-h-16 overflow-y-auto">
                                          {seq.sequence}
                                        </div>
                                      </div>
                                    ))}
                                    {event.scientificData.protein_sequences?.map((seq: {sequence: string, length: number, type: string}, idx: number) => (
                                      <div key={`protein-${idx}`} className="mb-2 p-2 bg-black/20 rounded">
                                        <div className="text-orange-300 text-[13.5px] font-medium">Protein ({seq.length} aa):</div>
                                        <div className="text-orange-200 font-mono text-[13.5px] mt-1 break-all max-h-16 overflow-y-auto">
                                          {seq.sequence}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* AIDEV-NOTE: Database results display */}
                                {event.scientificData?.database_results && (
                                  <div className="mb-3 p-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-indigo-400 text-[13.5px] font-medium">🗄️ Database Results</span>
                                    </div>
                                    <div className="bg-black/20 p-2 rounded text-[13.5px]">
                                      <div className="text-indigo-300 font-medium mb-1">
                                        Source: {event.scientificData.database_results.source}
                                      </div>
                                      {event.scientificData.database_results.results?.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto">
                                          {event.scientificData.database_results.results.slice(0, 5).map((result: any, idx: number) => (
                                            <div key={idx} className="border-l-2 border-indigo-500/30 pl-2 py-1 text-indigo-200">
                                              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                                            </div>
                                          ))}
                                          {event.scientificData.database_results.results.length > 5 && (
                                            <div className="text-indigo-400 text-[13.5px] mt-1">
                                              ...and {event.scientificData.database_results.results.length - 5} more results
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="prose prose-xs prose-invert max-w-none overflow-x-auto">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeSanitize]}
                                    className="text-[13.5px] leading-relaxed"
                                    components={{
                                      pre: ({ children }) => (
                                        <pre className="bg-black/50 p-2 rounded text-[13.5px] overflow-x-auto max-w-full">
                                          {children}
                                        </pre>
                                      ),
                                      code: ({ children, className }) => (
                                        <code className={`${className} text-[13.5px] bg-black/30 px-1 py-0.5 rounded`}>
                                          {children}
                                        </code>
                                      )
                                    }}
                                  >
                                    {sanitizeInput(event.content || '')}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">
                                {event.content}
                              </div>
                            )}
                            </div>
                          )}

                          {/* AIDEV-NOTE: Real image display for scientific plots */}
                          {(event.type === 'visualization' || event.type === 'image_generation') && (
                            <div className="mt-3">
                              {/* Real images from metadata with controls */}
                              {event.metadata?.image_url && (
                                <div className="bg-black/20 p-2 rounded">
                                  <div className="relative">
                                    <img
                                      src={event.metadata.image_url}
                                      alt={event.metadata.filename || 'Generated Plot'}
                                      className="w-full h-auto max-h-64 object-contain rounded"
                                      onError={(e) => {
                                        console.error('Failed to load image:', event.metadata.image_url)
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />

                                    {/* Image Controls Overlay */}
                                    <div className="absolute top-1 right-1 flex space-x-1">
                                      {/* Copy Image URL */}
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${backendUrl}${event.metadata.image_url}`)
                                          toast.success('Image URL copied', { icon: '🔗' })
                                        }}
                                        className="p-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                                        title="Copy image URL"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>

                                      {/* Download Image */}
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a')
                                          link.href = `${backendUrl}${event.metadata.image_url}`
                                          link.download = event.metadata.filename || 'scientific_plot.png'
                                          document.body.appendChild(link)
                                          link.click()
                                          document.body.removeChild(link)
                                          toast.success('Image downloaded', { icon: '💾' })
                                        }}
                                        className="p-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                                        title="Download image"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>

                                      {/* AIDEV-NOTE: Enlarge Image - replaced Image icon with Maximize2 for better UX */}
                                      <button
                                        onClick={() => {
                                          // Use same URL as the displayed image
                                          const imageUrl = event.metadata.image_url

                                          // Create a modal for better visualization
                                          const modal = document.createElement('div')
                                          modal.style.cssText = 'position: fixed; inset: 0; z-index: 9999; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; padding: 1rem;'
                                          modal.onclick = (e) => {
                                            if (e.target === modal) {
                                              document.body.removeChild(modal)
                                            }
                                          }

                                          const container = document.createElement('div')
                                          container.style.cssText = 'position: relative; max-width: 90vw; max-height: 90vh; background: rgba(17, 24, 39, 0.95); border-radius: 0.5rem; padding: 1rem; border: 1px solid rgba(107, 114, 128, 0.5); display: flex; flex-direction: column;'

                                          // Close button
                                          const closeBtn = document.createElement('button')
                                          closeBtn.innerHTML = '✕'
                                          closeBtn.style.cssText = 'position: absolute; top: 0.5rem; right: 0.5rem; width: 2rem; height: 2rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border-radius: 0.5rem; border: none; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; z-index: 10;'
                                          closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(239, 68, 68, 0.3)' }
                                          closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(239, 68, 68, 0.2)' }
                                          closeBtn.onclick = () => document.body.removeChild(modal)

                                          // Title
                                          const title = document.createElement('div')
                                          title.style.cssText = 'color: #67e8f9; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; padding-right: 3rem;'
                                          title.textContent = event.metadata.filename || 'Scientific Visualization'

                                          // Image container
                                          const imgContainer = document.createElement('div')
                                          imgContainer.style.cssText = 'flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center;'

                                          // Image
                                          const img = document.createElement('img')
                                          img.src = imageUrl  // Use the same URL as displayed image
                                          img.style.cssText = 'max-width: 100%; max-height: calc(90vh - 4rem); object-fit: contain; display: block;'
                                          img.alt = event.metadata.filename || 'Scientific Plot'
                                          img.onerror = () => {
                                            console.error('Failed to load enlarged image:', imageUrl)
                                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+RmFpbGVkIHRvIGxvYWQgaW1hZ2U8L3RleHQ+PC9zdmc+'
                                          }

                                          container.appendChild(closeBtn)
                                          container.appendChild(title)
                                          imgContainer.appendChild(img)
                                          container.appendChild(imgContainer)
                                          modal.appendChild(container)
                                          document.body.appendChild(modal)

                                          // Focus trap for accessibility
                                          closeBtn.focus()
                                        }}
                                        className="p-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                                        title="Enlarge for better visualization"
                                      >
                                        <Maximize2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-[13.5px] text-gray-400 mt-1 text-center">
                                    {event.metadata.filename || 'Scientific Visualization'}
                                  </div>
                                </div>
                              )}

                              {/* Fallback to mock images if no real images */}
                              {!event.metadata?.image_url && event.metadata?.images && (
                                <ImageDisplay
                                  images={event.metadata.images}
                                  title={event.metadata.caption || 'Scientific Plots'}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div ref={rightPanelEndRef} />
        </div>
      </div>
      
      {/* Message Limit Modal - Same beautiful design */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-3">Conversation Limit</h2>
            <p className="text-gray-300 mb-6">
              You've reached the limit for this conversation. Start a new session to continue.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  startNewSession()
                  setShowLimitModal(false)
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200"
              >
                Start Enhanced Session
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

      {/* File Manager Modal */}
      <FileManagerModal
        isOpen={showFileManagerModal}
        onClose={() => setShowFileManagerModal(false)}
        files={fileManager.generatedFiles}
        onRefresh={loadGeneratedFiles}
        onFileUpload={(files) => {
          const fileArray = Array.from(files)
          handleFileUpload(fileArray)
        }}
        onDeleteFile={async (file) => {
          try {
            const response = await fetch(`${backendUrl}/files/${encodeURIComponent(file.name)}`, {
              method: 'DELETE'
            })
            if (response.ok) {
              loadGeneratedFiles()
            }
          } catch (error) {
            console.error('Failed to delete file:', error)
          }
        }}
        backendUrl={backendUrl || "http://localhost:8000"}
      />

      {/* Conversation History Modal */}
      <ConversationHistory
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        conversations={conversationHistory}
        currentSessionId={currentSessionId}
        onLoadConversation={async (sessionId) => {
          await loadConversation(sessionId)
          setShowHistoryModal(false)
        }}
        onDeleteConversation={async (sessionId) => {
          try {
            const response = await fetch(`${backendUrl}/conversations/${sessionId}`, {
              method: 'DELETE'
            })
            if (response.ok) {
              const updatedHistory = conversationHistory.filter(c => c.session_id !== sessionId)
              setConversationHistory(updatedHistory)
              toast.success('Conversation deleted', { icon: '🗑️' })
            }
          } catch (error) {
            console.error('Failed to delete conversation:', error)
          }
        }}
        onExportConversation={(sessionId, format) => {
          const conversation = conversationHistory.find(c => c.session_id === sessionId)
          if (conversation) {
            const data = format === 'json'
              ? JSON.stringify(conversation, null, 2)
              : `# Conversation: ${conversation.title}\n\n${conversation.messages?.map((m: any) =>
                `## ${m.role}\n${m.content}\n`).join('\n')}`

            const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `conversation_${sessionId}.${format === 'json' ? 'json' : 'md'}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
        }}
      />
    </ErrorBoundary>
  )
}

export default BiomniCompleteGlass