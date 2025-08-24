// AIDEV-NOTE: Unified app with Google OAuth and routing for both agents
import { Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { Conversations, Literature, Experiments, DataSets, ConnectionTest, Welcome } from './pages'
import { ConversationProvider } from './contexts/ConversationContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginScreen } from './components/auth/LoginScreen'
import { GOOGLE_CLIENT_ID } from './config/auth'
import { lazy, Suspense } from 'react'

// Lazy load the Analysis Agent (Biomni) component
const AnalysisAgent = lazy(() => import('./pages/AnalysisAgent'))
const AnalysisAgentUltra = lazy(() => import('./pages/AnalysisAgentUltra'))

// Loading component for Suspense
const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
      <p className="text-text-secondary">Loading agent...</p>
    </div>
  </div>
)

function AppContent() {
  const { isAuthenticated, login } = useAuth()

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onSuccess={login} />
  }

  // AIDEV-NOTE: Unified routing for both Analysis and Research agents
  // Routes are organized by agent type with shared components
  return (
    <Routes>
      {/* Welcome/Landing page */}
      <Route path="/" element={<Welcome />} />
      
      {/* Analysis Agent (Biomni) Routes */}
      <Route path="/analysis" element={
        <Suspense fallback={<LoadingFallback />}>
          <AnalysisAgentUltra />
        </Suspense>
      } />
      
      {/* Legacy Analysis Agent Route */}
      <Route path="/analysis-old" element={
        <Suspense fallback={<LoadingFallback />}>
          <AnalysisAgent />
        </Suspense>
      } />
      
      {/* Research Agent Routes - wrapped in ConversationProvider and AppShell */}
      <Route path="/research/*" element={
        <ConversationProvider>
          <AppShell agentType="research">
            <Routes>
              <Route index element={<Conversations />} />
              <Route path="literature" element={<Literature />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="datasets" element={<DataSets />} />
              <Route path="test" element={<ConnectionTest />} />
            </Routes>
          </AppShell>
        </ConversationProvider>
      } />

      {/* Redirect old routes for backward compatibility */}
      <Route path="/literature" element={<Navigate to="/research/literature" replace />} />
      <Route path="/experiments" element={<Navigate to="/research/experiments" replace />} />
      <Route path="/datasets" element={<Navigate to="/research/datasets" replace />} />
      <Route path="/test" element={<Navigate to="/research/test" replace />} />
    </Routes>
  )
}

function App() {
  // AIDEV-NOTE: GoogleOAuthProvider wraps the entire app for authentication
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(17, 24, 39, 0.95)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              borderRadius: '0.75rem',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
              style: {
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
              style: {
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              },
            },
          }}
        />
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App