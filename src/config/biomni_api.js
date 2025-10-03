/**
 * Biomni API Configuration
 * Frontend-Backend communication setup for port 3000 ↔ port 8001
 */

// API Configuration for Biomni Bridge
// TEMPORARY HARDCODED FALLBACK FOR TESTING
const getBackendUrl = () => {
  // If accessing from localhost, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000'
  }
  // HARDCODED EXTERNAL IP FOR NOW
  return 'http://34.63.186.188:8000'
}

const backendUrl = getBackendUrl()
console.log('🔧 Backend URL configured as:', backendUrl, 'for hostname:', window.location.hostname)

export const BIOMNI_API_CONFIG = {
  // Backend bridge server - with fallback to external IP
  BRIDGE_BASE_URL: backendUrl,
  BRIDGE_SSE_ENDPOINT: `${backendUrl}/api/chat/intelligent`,
  BRIDGE_HEALTH_ENDPOINT: `${backendUrl}/health`,
  
  // Frontend configuration
  FRONTEND_PORT: 3000,
  FRONTEND_BASE_URL: 'http://localhost:3000',
  
  // CORS and connection settings
  CONNECTION_TIMEOUT: 10000,
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000,
  
  // Event processing settings
  MAX_EVENTS_PER_SESSION: 100,
  TODO_UPDATE_DEBOUNCE: 500,
  
  // Model mapping (Biomni → React)
  MODEL_MAPPING: {
    'Sonnet-4': 'Claude Sonnet 4',
    'GPT4.1': 'GPT 4.1'
  }
}

// Check bridge server health
export const checkBridgeHealth = async () => {
  try {
    const response = await fetch(BIOMNI_API_CONFIG.BRIDGE_HEALTH_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (response.ok) {
      const health = await response.json()
      console.log('✅ Bridge server healthy:', health)
      return { healthy: true, data: health }
    } else {
      console.error('❌ Bridge server unhealthy:', response.status)
      return { healthy: false, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    console.error('❌ Bridge server unreachable:', error)
    return { healthy: false, error: error.message }
  }
}

// Create SSE connection to bridge
export const createBridgeSSEConnection = (query, sessionId, model, onEvent, onError, onOpen) => {
  const url = new URL(BIOMNI_API_CONFIG.BRIDGE_SSE_ENDPOINT)
  url.searchParams.set('message', query)
  url.searchParams.set('session_id', sessionId)
  url.searchParams.set('model', model)
  
  console.log('🔗 Connecting to Biomni bridge:', url.toString())
  
  const eventSource = new EventSource(url.toString())
  
  // Connection opened
  eventSource.onopen = () => {
    console.log('🎉 Biomni bridge connection opened')
    if (onOpen) onOpen()
  }
  
  // Receive events
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('📨 Biomni bridge event:', data.type, data)
      if (onEvent) onEvent(data)
    } catch (error) {
      console.error('❌ Failed to parse bridge event:', error, event.data)
    }
  }
  
  // Connection error
  eventSource.onerror = (error) => {
    console.error('❌ Biomni bridge connection error:', error)
    if (onError) onError(error)
  }
  
  return eventSource
}

// Validate bridge communication
export const testBridgeCommunication = async () => {
  console.log('🧪 Testing Biomni bridge communication...')
  
  // Step 1: Health check
  const health = await checkBridgeHealth()
  if (!health.healthy) {
    return { success: false, error: 'Bridge server not healthy', details: health.error }
  }
  
  // Step 2: Test SSE connection
  return new Promise((resolve) => {
    const testQuery = "What is 1+1?"
    const testSessionId = `test_${Date.now()}`
    
    let eventCount = 0
    let hasToolCall = false
    let hasObservation = false
    
    const eventSource = createBridgeSSEConnection(
      testQuery,
      testSessionId,
      'Sonnet-4',
      (data) => {
        eventCount++
        
        if (data.type === 'tool_call') hasToolCall = true
        if (data.type === 'observation') hasObservation = true
        
        // Test passed if we get basic events
        if (eventCount >= 3 && (hasToolCall || hasObservation)) {
          eventSource.close()
          resolve({ 
            success: true, 
            events: eventCount,
            hasToolCall,
            hasObservation
          })
        }
        
        // Safety timeout
        if (eventCount >= 10) {
          eventSource.close()
          resolve({ 
            success: eventCount > 0,
            events: eventCount,
            hasToolCall,
            hasObservation
          })
        }
      },
      (error) => {
        eventSource.close()
        resolve({ success: false, error: 'SSE connection failed', details: error })
      },
      () => {
        console.log('✅ Bridge SSE connection established')
      }
    )
    
    // Timeout safety
    setTimeout(() => {
      eventSource.close()
      resolve({ success: false, error: 'Communication test timeout' })
    }, 15000)
  })
}