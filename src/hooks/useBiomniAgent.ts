import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: { name: string; id: string }[]
  images?: string[]
  solution?: string
}

interface TodoItem {
  id: number
  text: string
  completed: boolean
}

interface ScientificData {
  measurements?: Array<{value: number, unit: string}>
  dna_sequences?: Array<{sequence: string, length: number, type: string}>
  protein_sequences?: Array<{sequence: string, length: number, type: string}>
  molecular_properties?: {
    molecular_weight?: number
    smiles?: string
    formula?: string
    [key: string]: any
  }
  database_results?: {
    source: string
    query: string
    results: any[]
  }
}

interface ExecutionEvent {
  type: string
  content?: string
  timestamp: Date
  expanded?: boolean
  metadata?: any
  scientificData?: ScientificData
}

export const useBiomniAgent = () => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([])
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  
  // Connection state
  const [backendUrl, setBackendUrl] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<'detecting' | 'ready' | 'connected' | 'error'>('detecting')
  const [selectedModel, setSelectedModel] = useState<'GPT4.1' | 'Sonnet-4'>('Sonnet-4')
  const [activeModel, setActiveModel] = useState<string | null>(null)
  
  // File management
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; id: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // UI state
  const [messageCount, setMessageCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)

  // Utility functions
  const addLog = useCallback((message: string) => {
    console.log(message)
  }, [])

  const updateStatusStep = useCallback((index: number, status: 'active' | 'completed') => {
    // This would be implemented based on your status steps logic
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !backendUrl) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      addLog(`📤 Starting upload of ${files.length} files...`)
      
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append('files', file)
        addLog(`📁 Queued: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
      })
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 15
        })
      }, 200)
      
      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: formData,
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (response.ok) {
        const result = await response.json()
        addLog(`✅ Upload complete: ${result.message}`)
        toast.success(`Successfully uploaded ${result.total} files!`, { icon: '📎' })
        
        const newFiles = Array.from(files).map(file => ({
          name: file.name,
          id: `file-${Date.now()}-${Math.random()}`,
          size: file.size,
          type: file.type,
          uploaded: true,
          uploadedAt: new Date().toISOString()
        }))
        setUploadedFiles(prev => [...prev, ...newFiles])
        
        setTimeout(() => {
          setIsUploading(false)
          setUploadProgress(0)
        }, 1500)
        
      } else {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.error || errorMessage
        } catch (e) {
          const errorText = await response.text()
          errorMessage = `${response.status} ${response.statusText}`
        }
        
        toast.error(`Upload failed: ${errorMessage}`)
        setIsUploading(false)
        setUploadProgress(0)
      }
    } catch (error) {
      addLog(`❌ Upload error: ${error}`)
      toast.error('Upload error')
      setIsUploading(false)
      setUploadProgress(0)
    }
    
    if (e.target) {
      e.target.value = ''
    }
  }, [backendUrl, addLog])

  const removeUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    addLog(`🗑️ Removed uploaded file: ${fileId}`)
    toast.success('File removed', { icon: '🗑️' })
  }, [addLog])

  const toggleEventExpansion = useCallback((index: number) => {
    setExecutionEvents(prev => prev.map((event, i) => 
      i === index ? { ...event, expanded: !event.expanded } : event
    ))
  }, [])

  const stopProcessing = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsProcessing(false)
    setActiveModel(null)
    setConnectionStatus('ready')
    toast('Processing stopped', { icon: '⏹️' })
  }, [])

  const startNewSession = useCallback(() => {
    setMessages([])
    setMessageCount(0)
    setShowLimitModal(false)
    setInput('')
    setTodos([])
    setExecutionEvents([])
    setActiveModel(null)
    setGeneratedImages([])
    setCurrentStreamingMessage('')
    setUploadedFiles([])
    toast.success('New session started!', { icon: '🧬' })
  }, [])

  return {
    // State
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
    setIsUploading,
    uploadProgress,
    setUploadProgress,
    messageCount,
    setMessageCount,
    showLimitModal,
    setShowLimitModal,
    
    // Refs
    eventSourceRef,
    
    // Actions
    handleFileUpload,
    removeUploadedFile,
    toggleEventExpansion,
    stopProcessing,
    startNewSession,
    addLog,
    updateStatusStep
  }
}
