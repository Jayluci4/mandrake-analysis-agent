// AIDEV-NOTE: Public metrics dashboard (no auth required for testing)
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Users, MessageSquare, TrendingUp, Database } from 'lucide-react'

export default function PublicMetrics() {
  const [stats, setStats] = useState<any>({
    sessions: [],
    conversations: [],
    errors: [],
    counts: {}
  })
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sessions' | 'conversations'>('overview')

  useEffect(() => {
    loadPublicData()
  }, [])

  const loadPublicData = async () => {
    setLoading(true)
    try {
      // First sign in anonymously to access the data
      const { data: { session: authSession } } = await supabase.auth.getSession()
      console.log('Current auth session:', authSession)

      // Get counts
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
      
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })

      // Get recent sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('session_id, agent_type, model, query_count, follow_up_count, duration_seconds, status, started_at')
        .order('started_at', { ascending: false })
        .limit(20)
      
      if (sessionError) {
        console.error('Session error:', sessionError)
      }

      // Get recent conversations  
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('id, title, agent_type, model, query_count, session_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (convError) {
        console.error('Conversation error:', convError)
      }

      // Get error count
      const { count: errorCount } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })

      setStats({
        sessions: sessionData || [],
        conversations: convData || [],
        errors: [],
        counts: {
          sessions: sessionCount || 0,
          conversations: convCount || 0,
          errors: errorCount || 0
        }
      })

    } catch (error) {
      console.error('Failed to load metrics:', error)
      // Try to show what we can
      setStats({
        sessions: [],
        conversations: [],
        errors: [],
        counts: {
          sessions: 0,
          conversations: 0,
          errors: 0,
          note: 'Could not load data - check console for errors'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <BarChart className="w-8 h-8 text-cyan-500" />
          System Metrics Dashboard
        </h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          {['overview', 'sessions', 'conversations'].map((tab) => (
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
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Database className="w-6 h-6 text-cyan-500" />
                <span className="text-2xl font-bold">{stats.counts.sessions}</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Total Sessions</h3>
              <p className="text-gray-500 text-xs mt-1">User sessions tracked</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="w-6 h-6 text-green-500" />
                <span className="text-2xl font-bold">{stats.counts.conversations}</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Total Conversations</h3>
              <p className="text-gray-500 text-xs mt-1">Conversations created</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-6 h-6 text-orange-500" />
                <span className="text-2xl font-bold">{stats.counts.errors}</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Errors Logged</h3>
              <p className="text-gray-500 text-xs mt-1">System errors tracked</p>
            </div>

            {stats.counts.note && (
              <div className="col-span-full bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">{stats.counts.note}</p>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {selectedTab === 'sessions' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            {stats.sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No sessions yet. Start using the Analysis Agent to create sessions.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Session ID</th>
                    <th className="px-4 py-3 text-left">Agent</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Queries</th>
                    <th className="px-4 py-3 text-left">Follow-ups</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sessions.map((session: any, idx: number) => (
                    <tr key={session.session_id || idx} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {session.session_id?.substring(0, 20)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          session.agent_type === 'analysis' 
                            ? 'bg-purple-900 text-purple-300' 
                            : 'bg-orange-900 text-orange-300'
                        }`}>
                          {session.agent_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          session.model === 'GPT4.1' 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-blue-900 text-blue-300'
                        }`}>
                          {session.model || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{session.query_count || 0}</td>
                      <td className="px-4 py-3">{session.follow_up_count || 0}</td>
                      <td className="px-4 py-3">
                        {session.duration_seconds 
                          ? `${Math.round(session.duration_seconds / 60)}m` 
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          session.status === 'active' 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {session.status || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Conversations Tab */}
        {selectedTab === 'conversations' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            {stats.conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No conversations yet. Start chatting to create conversations.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Agent</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Queries</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.conversations.map((conv: any) => (
                    <tr key={conv.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        {conv.title?.substring(0, 50) || 'Untitled'}...
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          conv.agent_type === 'analysis' 
                            ? 'bg-purple-900 text-purple-300' 
                            : 'bg-orange-900 text-orange-300'
                        }`}>
                          {conv.agent_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{conv.model || '-'}</td>
                      <td className="px-4 py-3">{conv.query_count || 0}</td>
                      <td className="px-4 py-3 text-xs">
                        {conv.created_at 
                          ? new Date(conv.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={loadPublicData}
          className="fixed bottom-8 right-8 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg shadow-lg transition-colors"
        >
          Refresh Data
        </button>

        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            💡 Tip: Use the Analysis Agent at <a href="/analysis" className="underline">/analysis</a> to generate session data.
            Switch between models (GPT 4.1 ↔ Claude Sonnet 4) to create new sessions.
          </p>
        </div>
      </div>
    </div>
  )
}