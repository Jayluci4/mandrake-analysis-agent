// AIDEV-NOTE: API configuration for backend services
// Production URLs for Railway deployments

// Backend URLs - AIDEV-NOTE: Modified for GCP cloud Biomni bridge integration
export const API_URLS = {
  // Analysis Agent backend - POINT TO EXTERNAL IP FOR CLOUD ACCESS
  ANALYSIS_AGENT: import.meta.env.VITE_ANALYSIS_API_URL || 'http://35.223.254.208:8000',
  
  // Research Agent backend - Use external IP for cloud access
  RESEARCH_AGENT: import.meta.env.VITE_RESEARCH_API_URL || 'http://35.223.254.208:8000'
}

// Helper function to get the correct API URL based on agent type
export function getApiUrl(agentType: 'analysis' | 'research'): string {
  return agentType === 'analysis' ? API_URLS.ANALYSIS_AGENT : API_URLS.RESEARCH_AGENT
}