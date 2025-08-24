// AIDEV-NOTE: API configuration for backend services
// Production URLs for Railway deployments

// Backend URLs - always use production URLs unless overridden by env vars
export const API_URLS = {
  // Analysis Agent (Biomni) backend - CONFIRMED WORKING
  ANALYSIS_AGENT: import.meta.env.VITE_BIOMNI_API_URL || 'https://web-production-6cd4.up.railway.app',
  
  // Research Agent backend - CONFIRMED WORKING
  RESEARCH_AGENT: import.meta.env.VITE_RESEARCH_API_URL || 'https://web-production-40da3.up.railway.app'
}

// Helper function to get the correct API URL based on agent type
export function getApiUrl(agentType: 'analysis' | 'research'): string {
  return agentType === 'analysis' ? API_URLS.ANALYSIS_AGENT : API_URLS.RESEARCH_AGENT
}