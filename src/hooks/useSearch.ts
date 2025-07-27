import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient, WebSocketManager } from '@/lib/api'
import { SearchRequest, SearchResult, ProgressUpdate, WebSocketMessage, Paper } from '@/types'

interface UseSearchOptions {
  onProgress?: (progress: ProgressUpdate) => void
  onResult?: (result: SearchResult) => void
  onError?: (error: string) => void
  onPapersStream?: (papers: Paper[], phase: 'initial' | 'additional', count: number) => void
  onSummaryStream?: (chunk: string) => void
}

export function useSearch(options: UseSearchOptions = {}) {
  const [isSearching, setIsSearching] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resultProcessedRef = useRef(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect()
      wsManagerRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
  }, [])

  const pollTaskStatus = useCallback(async (taskId: string) => {
    console.log('Starting polling for task:', taskId)
    pollIntervalRef.current = setInterval(async () => {
      try {
        console.log('Polling task status for:', taskId)
        const status = await apiClient.getTaskStatus(taskId)
        console.log('Task status:', status)
        
        if (status.status === 'completed' && status.result && !resultProcessedRef.current) {
          console.log('Task completed with result:', status.result)
          resultProcessedRef.current = true
          setResult(status.result)
          setIsSearching(false)
          options.onResult?.(status.result)
          cleanup()
        } else if (status.status === 'failed') {
          const errorMsg = status.error || 'Search failed'
          console.log('Task failed:', errorMsg)
          setError(errorMsg)
          setIsSearching(false)
          options.onError?.(errorMsg)
          cleanup()
        } else {
          console.log('Task still in progress:', status.status)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)
  }, [cleanup, options])

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('WebSocket message received:', message.type, message)
    
    switch (message.type) {
      case 'connected':
        console.log('Connected to search task')
        break
        
      case 'progress':
        if (message.data && 'progress' in message.data) {
          const progressData = message.data as ProgressUpdate
          setProgress(progressData)
          options.onProgress?.(progressData)
        }
        break
        
      case 'papers':
        // Handle paper streaming
        if (message.data && 'papers' in message.data) {
          const papersData = message.data as {
            papers: Paper[]
            phase: 'initial' | 'additional'
            count: number
            message: string
          }
          console.log('Received papers stream:', papersData)
          options.onPapersStream?.(papersData.papers, papersData.phase, papersData.count)
        }
        break
        
      case 'summary_stream':
        // Handle summary streaming
        if (message.data && 'chunk' in message.data) {
          const summaryData = message.data as {
            chunk: string
            message: string
          }
          console.log('Received summary chunk:', summaryData.chunk.length, 'chars')
          options.onSummaryStream?.(summaryData.chunk)
        }
        break
        
      case 'result':
        if (message.data && 'papers' in message.data && !resultProcessedRef.current) {
          const resultData = message.data as SearchResult
          resultProcessedRef.current = true
          setResult(resultData)
          setIsSearching(false)
          options.onResult?.(resultData)
          cleanup()
        }
        break
        
      case 'error':
        if (message.data && 'error' in message.data) {
          const errorMsg = message.data.error
          setError(errorMsg)
          setIsSearching(false)
          options.onError?.(errorMsg)
          cleanup()
        }
        break
    }
  }, [cleanup, options])

  const searchMutation = useMutation({
    mutationFn: async (request: SearchRequest) => {
      cleanup()
      setIsSearching(true)
      setProgress(null)
      setResult(null)
      setError(null)
      resultProcessedRef.current = false

      console.log('Initiating search with request:', request)
      
      try {
        const response = await apiClient.initiateSearch(request)
        console.log('Search initiated successfully:', response)
        const { task_id } = response

        // Set a 5-minute timeout (instead of 2 minutes)
        searchTimeoutRef.current = setTimeout(() => {
          if (isSearching && !resultProcessedRef.current) {
            console.error('Search timeout after 5 minutes')
            const timeoutError = 'Search timeout: The search is taking longer than expected. Please try again.'
            setError(timeoutError)
            setIsSearching(false)
            options.onError?.(timeoutError)
            cleanup()
          }
        }, 300000) // 5 minutes

        // Try WebSocket first (with a small delay to ensure task is registered)
        setTimeout(() => {
          try {
            wsManagerRef.current = new WebSocketManager()
            wsManagerRef.current.connect(
              task_id,
              handleWebSocketMessage,
              (error) => {
                console.error('WebSocket error, falling back to polling:', error)
                // Fallback to polling
                pollTaskStatus(task_id)
              },
              () => {
                // onClose callback - if no result received, start polling
                if (!resultProcessedRef.current) {
                  console.log('WebSocket closed without result, starting polling')
                  wsManagerRef.current?.stopReconnection()
                  pollTaskStatus(task_id)
                }
              }
            )
          } catch (error) {
            console.error('WebSocket connection failed, using polling:', error)
            // Fallback to polling
            pollTaskStatus(task_id)
          }
        }, 100) // Small delay to ensure backend has registered the task

        return response
      } catch (error) {
        console.error('Failed to initiate search:', error)
        throw error
      }
    },
    onError: (error) => {
      console.error('Search mutation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Search failed'
      setError(errorMsg)
      setIsSearching(false)
      options.onError?.(errorMsg)
    },
  })

  const search = useCallback((query: string) => {
    return searchMutation.mutate({
      query,
      toggles: { search: true }
    })
  }, [searchMutation])

  const reset = useCallback(() => {
    cleanup()
    setIsSearching(false)
    setProgress(null)
    setResult(null)
    setError(null)
    resultProcessedRef.current = false
  }, [cleanup])

  return {
    search,
    isSearching,
    progress,
    result,
    error,
    reset,
  }
}