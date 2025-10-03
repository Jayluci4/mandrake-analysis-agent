// AIDEV-NOTE: Unified app with Google OAuth authentication and routing for both agents
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { Conversations, Literature, Experiments, DataSets, ConnectionTest, Welcome } from './pages'
import { ConversationProvider } from './contexts/ConversationContext'
import { GoogleAuthProvider, useGoogleAuth } from './context/GoogleAuthContext'
import { GoogleLoginScreen } from './components/GoogleLoginScreen'
import { lazy, Suspense } from 'react'

// Lazy load the Analysis Agent component// AIDEV-NOTE: Complete integration with file management
const BiomniCompleteGlass = lazy(() => import('./pages/MandrakeAnalysisAgent')) // AIDEV-NOTE: Glass morphism design with file management
const AdminMetrics = lazy(() => import('./pages/AdminMetrics'))
const PublicMetrics = lazy(() => import('./pages/PublicMetrics'))
const TestGoogleAuth = lazy(() => import('./pages/TestGoogleAuth')) // AIDEV-NOTE: Google OAuth test page

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
  const { isAuthenticated, isLoading, user } = useGoogleAuth()

  // Show loading spinner while checking auth state
  if (isLoading) {
    return <LoadingFallback />
  }

  // AIDEV-NOTE: Public routes that don't require authentication
  // Check for public metrics route first
  if (window.location.pathname === '/metrics' || window.location.pathname === '/test-auth') {
    return (
      <Routes>
        <Route path="/metrics" element={
          <Suspense fallback={<LoadingFallback />}>
            <PublicMetrics />
          </Suspense>
        } />
        <Route path="/test-auth" element={
          <Suspense fallback={<LoadingFallback />}>
            <TestGoogleAuth />
          </Suspense>
        } />
      </Routes>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <GoogleLoginScreen />
  }

  // AIDEV-NOTE: Unified routing for both Analysis and Research agents
  // Routes are organized by agent type with shared components
  return (
    <Routes>
      {/* Welcome/Landing page */}
      <Route path="/" element={<Welcome />} />
      
      {/* AIDEV-NOTE: Main Analysis Agent Route - Glass Morphism Biomni with enhanced file management and authentication */}
      <Route path="/AnalysisAgent" element={
        <Suspense fallback={<LoadingFallback />}>
          <BiomniCompleteGlass />
        </Suspense>
      } />
    
      
      {/* Admin Metrics Dashboard */}
      <Route path="/admin" element={
        <Suspense fallback={<LoadingFallback />}>
          <AdminMetrics />
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
  // AIDEV-NOTE: App with Google OAuth authentication
  return (
    <GoogleAuthProvider>
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
      </GoogleAuthProvider>
  )
}

export default App