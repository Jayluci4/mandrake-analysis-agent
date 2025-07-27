import { useState } from 'react'
import { apiClient } from '@/lib/api'

interface DebugInfo {
  health?: any
  debug?: any
}

export function ConnectionTest() {
  const [status, setStatus] = useState<string>('Not tested')
  const [error, setError] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  const testConnection = async () => {
    setStatus('Testing...')
    setError('')
    setDebugInfo(null)

    const apiUrl = import.meta.env.VITE_API_URL
    console.log('Testing connection to:', apiUrl)

    try {
      // First, try a simple fetch to see what we get
      const testUrl = `${apiUrl}/health`
      console.log('Fetching:', testUrl)
      
      const rawResponse = await fetch(testUrl)
      const rawText = await rawResponse.text()
      console.log('Raw response status:', rawResponse.status)
      console.log('Raw response headers:', Object.fromEntries(rawResponse.headers.entries()))
      console.log('Raw response text (first 500 chars):', rawText.substring(0, 500))

      // Now try through the API client
      const healthResponse = await apiClient.health()
      setStatus('Health check successful!')
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, health: healthResponse }))

      // Test debug config
      const debugResponse = await apiClient.getDebugConfig()
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, debug: debugResponse }))

    } catch (err: any) {
      setStatus('Connection failed')
      setError(err.message || 'Unknown error')
      console.error('Connection test failed:', err)
      
      // Try to get more info
      if (err.message.includes('Expected JSON')) {
        setError(err.message + ' - Check console for details. The backend might not be running or the URL might be incorrect.')
      }
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