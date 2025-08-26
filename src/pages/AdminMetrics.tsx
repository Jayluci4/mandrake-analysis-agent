// AIDEV-NOTE: Simple admin metrics dashboard to view tracked data
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { metricsService } from '@/lib/metrics'
import { useAuth } from '@/contexts/AuthContext'
import { BarChart, Users, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react'

export default function AdminMetrics() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [errors, setErrors] = useState<any[]>([])
  const [globalMetrics, setGlobalMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sessions' | 'conversations' | 'errors'>('overview')

  useEffect(() => {
    // Check auth status
    console.log('Admin dashboard - Current user:', user)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load sessions
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50)
      
      setSessions(sessionData || [])

      // Load conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      setConversations(convData || [])

      // Load errors
      const { data: errorData } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      setErrors(errorData || [])

      // Load global metrics
      const metrics = await metricsService.getGlobalMetrics()
      setGlobalMetrics(metrics)

    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <BarChart className="w-8 h-8 text-cyan-500" />
          Admin Metrics Dashboard
        </h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          {['overview', 'sessions', 'conversations', 'errors'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`px-4 py-2 capitalize ${
                selectedTab === tab 
                  ? 'border-b-2 border-cyan-500 text-cyan-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && globalMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={<Users className="w-6 h-6" />}
              title="Total Users"
              value={globalMetrics.totalUsers}
              subtitle={`${globalMetrics.activeUsersToday} active today`}
            />
            <MetricCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Total Conversations"
              value={globalMetrics.totalConversations}
              subtitle={`${globalMetrics.totalMessages} messages`}
            />
            <MetricCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Avg Messages/User"
              value={globalMetrics.averageMessagesPerUser?.toFixed(1) || '0'}
              subtitle="Per user average"
            />
            <MetricCard
              icon={<AlertCircle className="w-6 h-6" />}
              title="Error Rate"
              value={`${globalMetrics.errorRate?.toFixed(2) || '0'}%`}
              subtitle="System reliability"
            />

            {/* Model Distribution */}
            <div className="col-span-full mt-6">
              <h3 className="text-xl font-semibold mb-4">Model Usage Distribution</h3>
              <div className="bg-gray-900 rounded-lg p-4">
                {Object.entries(globalMetrics.modelDistribution || {}).map(([model, count]) => (
                  <div key={model} className="flex justify-between items-center py-2">
                    <span className="text-gray-300">{model}</span>
                    <span className="text-cyan-500 font-mono">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {selectedTab === 'sessions' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">Session ID</th>
                  <th className="px-4 py-3 text-left">Model</th>
                  <th className="px-4 py-3 text-left">Queries</th>
                  <th className="px-4 py-3 text-left">Follow-ups</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Started</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs">{session.session_id?.substring(0, 20)}...</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.model === 'GPT4.1' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'
                      }`}>
                        {session.model}
                      </span>
                    </td>
                    <td className="px-4 py-3">{session.query_count}</td>
                    <td className="px-4 py-3">{session.follow_up_count}</td>
                    <td className="px-4 py-3">
                      {session.duration_seconds ? `${Math.round(session.duration_seconds / 60)}m` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(session.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Conversations Tab */}
        {selectedTab === 'conversations' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-left">Model</th>
                  <th className="px-4 py-3 text-left">Queries</th>
                  <th className="px-4 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr key={conv.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3">{conv.title?.substring(0, 50)}...</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        conv.agent_type === 'analysis' ? 'bg-purple-900 text-purple-300' : 'bg-orange-900 text-orange-300'
                      }`}>
                        {conv.agent_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{conv.model || '-'}</td>
                    <td className="px-4 py-3">{conv.query_count || 0}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {conv.session_id?.substring(0, 15)}...
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(conv.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Errors Tab */}
        {selectedTab === 'errors' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((error) => (
                  <tr key={error.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">
                        {error.error_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{error.error_message?.substring(0, 100)}...</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {error.session_id?.substring(0, 15)}...
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(error.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={loadData}
          className="fixed bottom-8 right-8 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg shadow-lg transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ icon, title, value, subtitle }: any) {
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-cyan-500">{icon}</div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
    </div>
  )
}