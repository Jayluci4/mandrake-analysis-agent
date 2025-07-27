import { useState } from 'react'
import { apiClient } from '@/lib/api'

export function ConnectionTest() {
  const [status, setStatus] = useState<string>('Not tested')
  const [error, setError] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const testConnection = async () => {
    setStatus('Testing...')
    setError('')
    setDebugInfo(null)

    try {
      // Test health endpoint
      const healthResponse = await apiClient.health()
      setStatus('Health check successful!')
      setDebugInfo(prev => ({ ...prev, health: healthResponse }))

      // Test debug config
      const debugResponse = await apiClient.getDebugConfig()
      setDebugInfo(prev => ({ ...prev, debug: debugResponse }))

    } catch (err: any) {
      setStatus('Connection failed')
      setError(err.message || 'Unknown error')
      console.error('Connection test failed:', err)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Connection Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-800 rounded">
          <p className="text-sm text-gray-400">API URL:</p>
          <p className="font-mono">{import.meta.env.VITE_API_URL}</p>
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="text-sm text-gray-400">WebSocket URL:</p>
          <p className="font-mono">{import.meta.env.VITE_WS_URL}</p>
        </div>

        <button
          onClick={testConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Connection
        </button>

        <div className="p-4 bg-gray-800 rounded">
          <p className="text-sm text-gray-400">Status:</p>
          <p className={status === 'Health check successful!' ? 'text-green-500' : 'text-yellow-500'}>
            {status}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-600 rounded">
            <p className="text-sm text-red-400">Error:</p>
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {debugInfo && (
          <div className="p-4 bg-gray-800 rounded">
            <p className="text-sm text-gray-400 mb-2">Debug Info:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}