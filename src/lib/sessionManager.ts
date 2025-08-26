// AIDEV-NOTE: Session management for tracking user conversations, model switches, and query patterns
// Handles session boundaries, follow-up detection, and metrics collection

import { supabase } from './supabase'

export type AgentType = 'analysis' | 'research'
export type ModelType = 'GPT4.1' | 'Sonnet-4'

interface SessionData {
  sessionId: string
  userId: string
  agentType: AgentType
  model: ModelType
  startTime: Date
  lastActivityTime: Date
  messageCount: number
  queryCount: number
  followUpCount: number
  errorCount: number
  status: 'active' | 'ended' | 'error'
}

interface MessageMetrics {
  sessionId: string
  queryType: 'initial' | 'follow_up'
  queryNumber: number
  timestamp: Date
  isFollowUp: boolean
}

class SessionManager {
  private currentSession: SessionData | null = null
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private inactivityTimer: NodeJS.Timeout | null = null

  constructor() {
    // Initialize session manager
    this.loadExistingSession()
  }

  // Load existing session from localStorage (for recovery after page refresh)
  private loadExistingSession() {
    try {
      const stored = localStorage.getItem('current_session')
      if (stored) {
        const session = JSON.parse(stored) as SessionData
        // Check if session is still valid (not expired)
        const lastActivity = new Date(session.lastActivityTime)
        const timeSinceActivity = Date.now() - lastActivity.getTime()
        
        if (timeSinceActivity < this.INACTIVITY_TIMEOUT) {
          this.currentSession = {
            ...session,
            startTime: new Date(session.startTime),
            lastActivityTime: new Date(session.lastActivityTime)
          }
          this.startInactivityTimer()
        } else {
          // Session expired, clear it
          localStorage.removeItem('current_session')
        }
      }
    } catch (error) {
      console.error('Failed to load existing session:', error)
      localStorage.removeItem('current_session')
    }
  }

  // Start a new session
  async startNewSession(model: ModelType, agentType: AgentType): Promise<string> {
    // End current session if exists
    if (this.currentSession) {
      await this.endCurrentSession()
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user')
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.currentSession = {
      sessionId,
      userId: user.id,
      agentType,
      model,
      startTime: new Date(),
      lastActivityTime: new Date(),
      messageCount: 0,
      queryCount: 0,
      followUpCount: 0,
      errorCount: 0,
      status: 'active'
    }

    // Save to localStorage for recovery
    this.saveSessionToLocalStorage()

    // Track session start in database
    await this.trackSessionStart()

    // Start inactivity timer
    this.startInactivityTimer()

    return sessionId
  }

  // Check if we need a new session
  needsNewSession(model: ModelType, agentType: AgentType): boolean {
    if (!this.currentSession) return true
    
    // Check for model switch
    if (this.currentSession.model !== model) return true
    
    // Check for agent switch
    if (this.currentSession.agentType !== agentType) return true
    
    // Check for inactivity
    const timeSinceActivity = Date.now() - this.currentSession.lastActivityTime.getTime()
    if (timeSinceActivity > this.INACTIVITY_TIMEOUT) return true
    
    return false
  }

  // Handle model switch
  async onModelSwitch(newModel: ModelType): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    // Track the model switch event
    await this.trackModelSwitch(this.currentSession.model, newModel)

    // Start new session with new model
    return this.startNewSession(newModel, this.currentSession.agentType)
  }

  // Track a user message
  async trackUserMessage(content: string): Promise<MessageMetrics> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    this.currentSession.messageCount++
    this.currentSession.queryCount++
    
    const isFollowUp = this.currentSession.queryCount > 1
    if (isFollowUp) {
      this.currentSession.followUpCount++
    }

    this.currentSession.lastActivityTime = new Date()
    this.saveSessionToLocalStorage()
    this.resetInactivityTimer()

    const metrics: MessageMetrics = {
      sessionId: this.currentSession.sessionId,
      queryType: isFollowUp ? 'follow_up' : 'initial',
      queryNumber: this.currentSession.queryCount,
      timestamp: new Date(),
      isFollowUp
    }

    // Update session in database
    await this.updateSessionMetrics()

    return metrics
  }

  // Track an assistant message
  trackAssistantMessage() {
    if (!this.currentSession) return

    this.currentSession.messageCount++
    this.currentSession.lastActivityTime = new Date()
    this.saveSessionToLocalStorage()
    this.resetInactivityTimer()
  }

  // Track an error
  async trackError(error: any) {
    if (!this.currentSession) return

    this.currentSession.errorCount++
    this.saveSessionToLocalStorage()

    // Update error count in database
    await this.updateSessionMetrics()
  }

  // End current session
  async endCurrentSession() {
    if (!this.currentSession) return

    this.currentSession.status = 'ended'
    
    // Save final state to database
    await this.trackSessionEnd()

    // Clear session
    this.currentSession = null
    localStorage.removeItem('current_session')
    
    // Clear timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
  }

  // Get current session info
  getCurrentSession(): SessionData | null {
    return this.currentSession
  }

  // Get session ID
  getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId || null
  }

  // Private helper methods

  private saveSessionToLocalStorage() {
    if (this.currentSession) {
      localStorage.setItem('current_session', JSON.stringify(this.currentSession))
    }
  }

  private startInactivityTimer() {
    this.resetInactivityTimer()
  }

  private resetInactivityTimer() {
    // Clear existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }

    // Set new timer
    this.inactivityTimer = setTimeout(() => {
      console.log('Session expired due to inactivity')
      this.endCurrentSession()
    }, this.INACTIVITY_TIMEOUT)
  }

  // Database tracking methods

  private async trackSessionStart() {
    if (!this.currentSession) return

    try {
      const sessionData = {
        session_id: this.currentSession.sessionId,
        user_id: this.currentSession.userId,
        agent_type: this.currentSession.agentType,
        model: this.currentSession.model,
        started_at: this.currentSession.startTime.toISOString(),
        status: 'active',
        metadata: {
          ip_address: await this.getIPAddress(),
          user_agent: navigator.userAgent
        }
      }

      // Store in a sessions table (we'll create this)
      const { error } = await supabase
        .from('sessions')
        .insert(sessionData)

      if (error) {
        console.error('Failed to track session start:', error)
      }
    } catch (error) {
      console.error('Error tracking session start:', error)
    }
  }

  private async trackSessionEnd() {
    if (!this.currentSession) return

    try {
      const duration = Date.now() - this.currentSession.startTime.getTime()
      
      const { error } = await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: Math.floor(duration / 1000),
          query_count: this.currentSession.queryCount,
          follow_up_count: this.currentSession.followUpCount,
          error_count: this.currentSession.errorCount,
          message_count: this.currentSession.messageCount,
          status: 'completed'
        })
        .eq('session_id', this.currentSession.sessionId)

      if (error) {
        console.error('Failed to track session end:', error)
      }
    } catch (error) {
      console.error('Error tracking session end:', error)
    }
  }

  private async updateSessionMetrics() {
    if (!this.currentSession) return

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          query_count: this.currentSession.queryCount,
          follow_up_count: this.currentSession.followUpCount,
          error_count: this.currentSession.errorCount,
          message_count: this.currentSession.messageCount,
          last_activity: this.currentSession.lastActivityTime.toISOString()
        })
        .eq('session_id', this.currentSession.sessionId)

      if (error) {
        console.error('Failed to update session metrics:', error)
      }
    } catch (error) {
      console.error('Error updating session metrics:', error)
    }
  }

  private async trackModelSwitch(oldModel: ModelType, newModel: ModelType) {
    if (!this.currentSession) return

    try {
      // Log the model switch event
      const { error } = await supabase
        .from('model_switches')
        .insert({
          session_id: this.currentSession.sessionId,
          user_id: this.currentSession.userId,
          from_model: oldModel,
          to_model: newModel,
          switched_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to track model switch:', error)
      }
    } catch (error) {
      console.error('Error tracking model switch:', error)
    }
  }

  private async getIPAddress(): Promise<string> {
    // In production, this would come from the backend
    // For now, return a placeholder
    return 'client-ip'
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()