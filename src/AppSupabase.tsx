// AIDEV-NOTE: Test App component using Supabase Auth
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { SupabaseAuthProvider, useSupabaseAuth } from './contexts/SupabaseAuthContext'
import { SupabaseLoginScreen } from './components/auth/SupabaseLoginScreen'
import { WelcomeSupabase } from './pages/WelcomeSupabase'
import { lazy, Suspense } from 'react'

// Lazy load the Analysis Agent components
const AnalysisAgent = lazy(() => import('./pages/AnalysisAgent'))
const AnalysisAgentUltra = lazy(() => import('./pages/AnalysisAgentUltra'))

// Loading component
const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center bg-[#0f0e1d]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading agent...</p>
    </div>
  </div>
)

function AppContent() {
  const { isAuthenticated, loading } = useSupabaseAuth()

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingFallback />
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <SupabaseLoginScreen />
  }

  // Show main app routes when authenticated
  return (
    <Routes>
      {/* Welcome/Landing page */}
      <Route path="/" element={<WelcomeSupabase />} />
      
      {/* Analysis Agent Routes */}
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
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppSupabase() {
  return (
    <SupabaseAuthProvider>
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
    </SupabaseAuthProvider>
  )
}

export default AppSupabase