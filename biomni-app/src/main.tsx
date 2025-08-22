import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import AppBiomniUltra from './AppBiomniUltra.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
// import { AuthProvider } from './contexts/AuthContext.tsx'

// Google OAuth Client ID - Using Vite environment variables
// const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <AppBiomniUltra />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
