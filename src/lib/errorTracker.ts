// AIDEV-NOTE: Centralized error tracking and logging system
// Captures API errors, model failures, network issues, and user-facing errors

import { supabase } from './supabase'
import { sessionManager } from './sessionManager'

export type ErrorType = 'api_timeout' | 'api_error' | 'model_error' | 'network' | 'quota' | 'auth' | 'database' | 'session' | 'tracking' | 'model' | 'unknown'

interface ErrorContext {
  model?: string
  agentType?: string
  query?: string
  sessionId?: string
  conversationId?: string
  retryAttempt?: number
  apiEndpoint?: string
  statusCode?: number
  responseTime?: number
}

interface ErrorLog {
  id?: string
  timestamp: Date
  errorType: ErrorType
  errorMessage: string
  errorDetails?: any
  context: ErrorContext
  stack?: string
  userId?: string
  resolved?: boolean
}

class ErrorTracker {
  private errorQueue: ErrorLog[] = []
  private isOnline = navigator.onLine
  private readonly MAX_RETRY_ATTEMPTS = 3

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushErrorQueue()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // Main error logging method
  async logError(
    errorType: ErrorType,
    errorMessage: string,
    context: ErrorContext = {},
    errorDetails?: any
  ): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get current session ID if not provided
      if (!context.sessionId) {
        context.sessionId = sessionManager.getCurrentSessionId() || undefined
      }

      const errorLog: ErrorLog = {
        timestamp: new Date(),
        errorType,
        errorMessage,
        errorDetails,
        context,
        stack: errorDetails?.stack || new Error().stack,
        userId: user?.id,
        resolved: false
      }

      // Save to localStorage first (immediate backup)
      this.saveToLocalStorage(errorLog)

      // Update session error count
      if (context.sessionId) {
        await sessionManager.trackError(errorLog)
      }

      // Try to save to database
      if (this.isOnline) {
        await this.saveToDatabase(errorLog)
      } else {
        // Queue for later
        this.errorQueue.push(errorLog)
      }

      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('[Error Tracked]', {
          type: errorType,
          message: errorMessage,
          context,
          details: errorDetails
        })
      }
    } catch (error) {
      // Even error tracking failed, at least log to console
      console.error('Failed to track error:', error)
    }
  }

  // Specific error type helpers

  async logAPIError(
    endpoint: string,
    statusCode: number,
    message: string,
    query?: string
  ): Promise<void> {
    await this.logError(
      'api_error',
      `API Error: ${message}`,
      {
        apiEndpoint: endpoint,
        statusCode,
        query
      },
      { endpoint, statusCode, message }
    )
  }

  async logModelError(
    model: string,
    message: string,
    query?: string
  ): Promise<void> {
    await this.logError(
      'model_error',
      `Model Error (${model}): ${message}`,
      {
        model,
        query
      }
    )
  }

  async logNetworkError(
    message: string,
    endpoint?: string
  ): Promise<void> {
    await this.logError(
      'network',
      `Network Error: ${message}`,
      {
        apiEndpoint: endpoint
      }
    )
  }

  async logTimeoutError(
    endpoint: string,
    timeoutMs: number,
    query?: string
  ): Promise<void> {
    await this.logError(
      'api_timeout',
      `Request timeout after ${timeoutMs}ms`,
      {
        apiEndpoint: endpoint,
        responseTime: timeoutMs,
        query
      }
    )
  }

  // Retry logic for failed operations
  async withRetry<T>(
    operation: () => Promise<T>,
    errorContext: ErrorContext,
    maxAttempts = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Log the retry attempt
        await this.logError(
          'api_error',
          `Retry attempt ${attempt} of ${maxAttempts} failed`,
          {
            ...errorContext,
            retryAttempt: attempt
          },
          error
        )

        // Wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    // All retries failed
    await this.logError(
      'api_error',
      `All ${maxAttempts} retry attempts failed`,
      errorContext,
      lastError
    )

    throw lastError
  }

  // Private methods

  private async saveToDatabase(errorLog: ErrorLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .insert({
          user_id: errorLog.userId,
          session_id: errorLog.context.sessionId,
          error_type: errorLog.errorType,
          error_message: errorLog.errorMessage,
          error_details: errorLog.errorDetails,
          error_context: errorLog.context,
          stack_trace: errorLog.stack,
          created_at: errorLog.timestamp.toISOString()
        })

      if (error) {
        console.error('Failed to save error to database:', error)
        // Keep in queue for retry
        this.errorQueue.push(errorLog)
      }
    } catch (error) {
      console.error('Error saving to database:', error)
      this.errorQueue.push(errorLog)
    }
  }

  private saveToLocalStorage(errorLog: ErrorLog): void {
    try {
      const key = `error_log_${Date.now()}`
      localStorage.setItem(key, JSON.stringify(errorLog))
      
      // Clean up old error logs (keep last 50)
      this.cleanupLocalStorageErrors()
    } catch (error) {
      console.error('Failed to save error to localStorage:', error)
    }
  }

  private cleanupLocalStorageErrors(): void {
    try {
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'))
        .sort()

      // Keep only the last 50 errors
      if (errorKeys.length > 50) {
        const keysToRemove = errorKeys.slice(0, errorKeys.length - 50)
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.error('Failed to cleanup localStorage errors:', error)
    }
  }

  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return

    const errors = [...this.errorQueue]
    this.errorQueue = []

    for (const errorLog of errors) {
      await this.saveToDatabase(errorLog)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get error statistics for admin
  async getErrorStats(userId?: string, timeRange?: { from: Date; to: Date }): Promise<any> {
    try {
      let query = supabase
        .from('error_logs')
        .select('error_type, count')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.from.toISOString())
          .lte('created_at', timeRange.to.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Group by error type
      const stats = data?.reduce((acc: any, curr: any) => {
        acc[curr.error_type] = (acc[curr.error_type] || 0) + 1
        return acc
      }, {})

      return stats
    } catch (error) {
      console.error('Failed to get error stats:', error)
      return null
    }
  }

  // Get recent errors for debugging
  async getRecentErrors(limit = 10): Promise<ErrorLog[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get recent errors:', error)
      
      // Fallback to localStorage
      return this.getLocalStorageErrors(limit)
    }
  }

  private getLocalStorageErrors(limit: number): ErrorLog[] {
    try {
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'))
        .sort()
        .slice(-limit)

      return errorKeys.map(key => {
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : null
      }).filter(Boolean)
    } catch (error) {
      console.error('Failed to get localStorage errors:', error)
      return []
    }
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker()