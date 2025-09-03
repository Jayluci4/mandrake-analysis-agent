// AIDEV-NOTE: Analytics and metrics tracking for admin visibility
// Provides aggregated data and insights about usage patterns

import { supabase } from './supabase'
import { sessionManager } from './sessionManager'

export interface UserMetrics {
  userId: string
  totalConversations: number
  totalMessages: number
  totalQueries: number
  totalFollowUps: number
  averageQueriesPerSession: number
  averageSessionDuration: number // in seconds
  favoriteModel: string
  modelUsage: Record<string, number>
  agentUsage: Record<string, number>
  errorRate: number
  lastActive: Date
  firstSeen: Date
  peakUsageHour: number // 0-23
  peakUsageDay: number // 0-6 (Sunday-Saturday)
}

export interface GlobalMetrics {
  totalUsers: number
  activeUsersToday: number
  activeUsersThisWeek: number
  activeUsersThisMonth: number
  totalConversations: number
  totalMessages: number
  averageMessagesPerUser: number
  modelDistribution: Record<string, number>
  agentDistribution: Record<string, number>
  errorRate: number
  peakHours: number[]
  averageResponseTime: number
}

export interface SessionMetrics {
  sessionId: string
  userId: string
  duration: number
  queryCount: number
  followUpCount: number
  errorCount: number
  model: string
  agentType: string
  startTime: Date
  endTime?: Date
}

class MetricsService {
  // Get metrics for a specific user
  async getUserMetrics(userId: string): Promise<UserMetrics | null> {
    try {
      // Get user's conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)

      if (convError) throw convError

      // Get user's messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)

      if (msgError) throw msgError

      // Get user's sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)

      if (sessionError) throw sessionError

      // Get user's errors
      const { data: errors, error: errorError } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', userId)

      if (errorError) throw errorError

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // Calculate metrics
      const totalQueries = messages?.filter(m => m.role === 'user').length || 0
      const totalFollowUps = messages?.filter(m => m.is_follow_up).length || 0
      const totalMessages = messages?.length || 0
      const totalConversations = conversations?.length || 0
      const totalSessions = sessions?.length || 0
      const totalErrors = errors?.length || 0

      // Calculate model usage
      const modelUsage: Record<string, number> = {}
      conversations?.forEach(conv => {
        const model = conv.model || 'unknown'
        modelUsage[model] = (modelUsage[model] || 0) + 1
      })

      // Calculate agent usage
      const agentUsage: Record<string, number> = {}
      conversations?.forEach(conv => {
        const agent = conv.agent_type || 'unknown'
        agentUsage[agent] = (agentUsage[agent] || 0) + 1
      })

      // Find favorite model
      const favoriteModel = Object.entries(modelUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'

      // Calculate average session duration
      const sessionDurations = sessions
        ?.filter(s => s.duration_seconds)
        .map(s => s.duration_seconds) || []
      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0

      // Calculate average queries per session
      const averageQueriesPerSession = totalSessions > 0
        ? totalQueries / totalSessions
        : 0

      // Calculate error rate
      const errorRate = totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0

      // Calculate peak usage patterns
      const hourCounts: Record<number, number> = {}
      const dayCounts: Record<number, number> = {}
      
      messages?.forEach(msg => {
        const date = new Date(msg.created_at)
        const hour = date.getHours()
        const day = date.getDay()
        
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
        dayCounts[day] = (dayCounts[day] || 0) + 1
      })

      const peakUsageHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '12'
      const peakUsageDay = Object.entries(dayCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '1'

      return {
        userId,
        totalConversations,
        totalMessages,
        totalQueries,
        totalFollowUps,
        averageQueriesPerSession,
        averageSessionDuration,
        favoriteModel,
        modelUsage,
        agentUsage,
        errorRate,
        lastActive: profile?.last_seen ? new Date(profile.last_seen) : new Date(),
        firstSeen: profile?.created_at ? new Date(profile.created_at) : new Date(),
        peakUsageHour: parseInt(peakUsageHour),
        peakUsageDay: parseInt(peakUsageDay)
      }
    } catch (error) {
      console.error('Failed to get user metrics:', error)
      return null
    }
  }

  // Get global metrics across all users
  async getGlobalMetrics(): Promise<GlobalMetrics | null> {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get active users today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: activeToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', today.toISOString())

      // Get active users this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const { count: activeWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', weekAgo.toISOString())

      // Get active users this month
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      
      const { count: activeMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', monthAgo.toISOString())

      // Get total conversations and messages
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })

      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })

      // Get model distribution
      const { data: modelData } = await supabase
        .from('conversations')
        .select('model')

      const modelDistribution: Record<string, number> = {}
      modelData?.forEach(item => {
        const model = item.model || 'unknown'
        modelDistribution[model] = (modelDistribution[model] || 0) + 1
      })

      // Get agent distribution
      const { data: agentData } = await supabase
        .from('conversations')
        .select('agent_type')

      const agentDistribution: Record<string, number> = {}
      agentData?.forEach(item => {
        const agent = item.agent_type || 'unknown'
        agentDistribution[agent] = (agentDistribution[agent] || 0) + 1
      })

      // Get error rate
      const { count: totalErrors } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })

      const errorRate = totalMessages && totalMessages > 0 
        ? (totalErrors || 0) / totalMessages * 100 
        : 0

      // Calculate average messages per user
      const averageMessagesPerUser = totalUsers && totalUsers > 0
        ? (totalMessages || 0) / totalUsers
        : 0

      // Get peak hours (simplified - would need more complex query in production)
      const { data: messages } = await supabase
        .from('messages')
        .select('created_at')
        .limit(1000) // Sample for performance

      const hourCounts: Record<number, number> = {}
      messages?.forEach(msg => {
        const hour = new Date(msg.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })

      const peakHours = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => parseInt(hour))

      return {
        totalUsers: totalUsers || 0,
        activeUsersToday: activeToday || 0,
        activeUsersThisWeek: activeWeek || 0,
        activeUsersThisMonth: activeMonth || 0,
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        averageMessagesPerUser,
        modelDistribution,
        agentDistribution,
        errorRate,
        peakHours,
        averageResponseTime: 0 // Would need to track this in messages table
      }
    } catch (error) {
      console.error('Failed to get global metrics:', error)
      return null
    }
  }

  // Get session-specific metrics
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error || !session) {
        console.error('Failed to get session:', error)
        return null
      }

      return {
        sessionId: session.session_id,
        userId: session.user_id,
        duration: session.duration_seconds || 0,
        queryCount: session.query_count || 0,
        followUpCount: session.follow_up_count || 0,
        errorCount: session.error_count || 0,
        model: session.model,
        agentType: session.agent_type,
        startTime: new Date(session.started_at),
        endTime: session.ended_at ? new Date(session.ended_at) : undefined
      }
    } catch (error) {
      console.error('Failed to get session metrics:', error)
      return null
    }
  }

  // Track response time for a message
  async trackResponseTime(messageId: string, responseTimeMs: number): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ response_time_ms: responseTimeMs })
        .eq('id', messageId)
    } catch (error) {
      console.error('Failed to track response time:', error)
    }
  }

  // Get usage trends over time
  async getUsageTrends(
    userId?: string,
    timeRange: { from: Date; to: Date } = {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    }
  ): Promise<any> {
    try {
      let query = supabase
        .from('messages')
        .select('created_at, role')
        .gte('created_at', timeRange.from.toISOString())
        .lte('created_at', timeRange.to.toISOString())

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      // Group by day
      const dailyCounts: Record<string, number> = {}
      data?.forEach(msg => {
        if (msg.role === 'user') {
          const date = new Date(msg.created_at).toLocaleDateString()
          dailyCounts[date] = (dailyCounts[date] || 0) + 1
        }
      })

      return dailyCounts
    } catch (error) {
      console.error('Failed to get usage trends:', error)
      return {}
    }
  }

  // Get model performance comparison
  async getModelComparison(): Promise<any> {
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('model, duration_seconds, query_count, error_count')

      const modelStats: Record<string, any> = {}

      sessions?.forEach(session => {
        const model = session.model || 'unknown'
        if (!modelStats[model]) {
          modelStats[model] = {
            totalSessions: 0,
            totalDuration: 0,
            totalQueries: 0,
            totalErrors: 0
          }
        }

        modelStats[model].totalSessions++
        modelStats[model].totalDuration += session.duration_seconds || 0
        modelStats[model].totalQueries += session.query_count || 0
        modelStats[model].totalErrors += session.error_count || 0
      })

      // Calculate averages
      Object.keys(modelStats).forEach(model => {
        const stats = modelStats[model]
        modelStats[model] = {
          ...stats,
          avgDuration: stats.totalDuration / stats.totalSessions,
          avgQueries: stats.totalQueries / stats.totalSessions,
          errorRate: (stats.totalErrors / stats.totalQueries) * 100
        }
      })

      return modelStats
    } catch (error) {
      console.error('Failed to get model comparison:', error)
      return {}
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService()