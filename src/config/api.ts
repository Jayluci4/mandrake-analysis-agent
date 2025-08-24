// AIDEV-NOTE: API configuration for backend services
// Production URLs for Railway deployments

// Backend URLs - use environment variables or fallback to production URLs
export const API_URLS = {
  // Analysis Agent (Biomni) backend
  ANALYSIS_AGENT: import.meta.env.VITE_BIOMNI_API_URL || 
    (import.meta.env.DEV 
      ? 'http://localhost:8003' 
      : 'https://web-production-a8f9b.up.railway.app'),
  
  // Research Agent backend  
  RESEARCH_AGENT: import.meta.env.VITE_RESEARCH_API_URL || 
    (import.meta.env.DEV 
      ? 'http://localhost:3001' 
      : 'https://web-production-40da3.up.railway.app')
}

// Helper function to get the correct API URL based on agent type
export function getApiUrl(agentType: 'analysis' | 'research'): string {
  return agentType === 'analysis' ? API_URLS.ANALYSIS_AGENT : API_URLS.RESEARCH_AGENT
}