// AIDEV-NOTE: API integration following the backend specification from frontendguide.md

import { SearchRequest, TaskStatus, WebSocketMessage } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
  window.location.host + '/ws'

export class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) throw new Error('Health check failed')
    return response.json()
  }

  async getDebugConfig() {
    const response = await fetch(`${this.baseUrl}/debug/config`)
    if (!response.ok) throw new Error('Failed to get debug config')
    return response.json()
  }

  async testSearch() {
    const response = await fetch(`${this.baseUrl}/debug/test-search`)
    if (!response.ok) throw new Error('Test search failed')
    return response.json()
  }

  async initiateSearch(request: SearchRequest) {
    console.log(`Sending search request to: ${this.baseUrl}/search`)
    console.log('Request body:', request)
    
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        let errorDetail = 'Search initiation failed'
        try {
          const error = await response.json()
          errorDetail = error.detail || errorDetail
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        throw new Error(`${response.status}: ${errorDetail}`)
      }

      const data = await response.json()
      console.log('Search response:', data)
      return data as { task_id: string; status: string; message: string }
    } catch (error) {
      console.error('Network error during search:', error)
      throw error
    }
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const url = `${this.baseUrl}/task/${taskId}`
    console.log('Fetching task status from:', url)
    
    try {
      // Add AbortController with 10-second timeout for polling requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(url, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('Task status response:', response.status)
      
      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Task status data:', data)
      return data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Task status request timed out, but search continues...')
        // Return in_progress status to continue polling
        return {
          task_id: taskId,
          status: 'in_progress',
          query: ''
        } as TaskStatus
      }
      console.error('Error fetching task status:', error)
      throw error
    }
  }

  createWebSocket(taskId: string): WebSocket {
    const wsUrl = `${WS_BASE_URL}/${taskId}`
    console.log('Creating WebSocket connection to:', wsUrl)
    return new WebSocket(wsUrl)
  }
}

export const apiClient = new ApiClient()

// WebSocket connection manager
export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 1000
  private shouldReconnect = true

  connect(
    taskId: string,
    onMessage: (message: WebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): WebSocket {
    this.disconnect()

    this.ws = apiClient.createWebSocket(taskId)

    this.ws.onopen = () => {
      console.log('WebSocket connected for task:', taskId)
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data)
      try {
        const message = JSON.parse(event.data) as WebSocketMessage
        console.log('Parsed WebSocket message:', message)
        onMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      onError?.(error)
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      onClose?.()
      
      // Attempt to reconnect only if we should
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`)
          this.connect(taskId, onMessage, onError, onClose)
        }, this.reconnectDelay * this.reconnectAttempts)
      }
    }

    return this.ws
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  stopReconnection() {
    this.shouldReconnect = false
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}