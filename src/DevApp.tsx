// AIDEV-NOTE: Development app with auth bypass for local Biomni testing
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { Conversations, Literature, Experiments, DataSets, ConnectionTest, Welcome } from './pages'
import { ConversationProvider } from './contexts/ConversationContext'
import { DevAuthProvider } from './contexts/DevAuthContext'
import { lazy, Suspense } from 'react'

// Lazy load the Analysis Agent component
const AnalysisAgent = lazy(() => import('./pages/AnalysisAgent'))
const AnalysisAgentUltra = lazy(() => import('./pages/AnalysisAgentUltra'))
const AdminMetrics = lazy(() => import('./pages/AdminMetrics'))
const PublicMetrics = lazy(() => import('./pages/PublicMetrics'))

// AIDEV-NOTE: Try to load our enhanced Biomni component
let AnalysisAgentUltraEnhanced: any = null
try {
  AnalysisAgentUltraEnhanced = lazy(() => import('./pages/AnalysisAgentUltraEnhanced'))
} catch {
  // Fallback to original if enhanced component not available
  console.log('Enhanced component not available, using original')
}

// Loading component for Suspense
const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
      <p className="text-text-secondary">Loading Biomni agent...</p>
    </div>
  </div>
)

function DevAppContent() {
  // AIDEV-NOTE: Development routes with auth bypass
  return (
    <Routes>
      {/* Welcome/Landing page */}
      <Route path="/" element={<Welcome />} />
      
      {/* Analysis Agent Routes - Enhanced for Biomni */}
      <Route path="/analysis" element={
        <Suspense fallback={<LoadingFallback />}>
          {AnalysisAgentUltraEnhanced ? <AnalysisAgentUltraEnhanced /> : <AnalysisAgentUltra />}
        </Suspense>
      } />
      
      {/* Biomni Enhanced Analysis Route */}
      <Route path="/biomni" element={
        <Suspense fallback={<LoadingFallback />}>
          {AnalysisAgentUltraEnhanced ? <AnalysisAgentUltraEnhanced /> : <AnalysisAgentUltra />}
        </Suspense>
      } />
      
      {/* Legacy Analysis Agent Route */}
      <Route path="/analysis-old" element={
        <Suspense fallback={<LoadingFallback />}>
          <AnalysisAgent />
        </Suspense>
      } />
      
      {/* Original Analysis Agent */}
      <Route path="/original" element={
        <Suspense fallback={<LoadingFallback />}>
          <AnalysisAgentUltra />
        </Suspense>
      } />
      
      {/* Admin Metrics Dashboard */}
      <Route path="/admin" element={
        <Suspense fallback={<LoadingFallback />}>
          <AdminMetrics />
        </Suspense>
      } />
      
      {/* Public Metrics */}
      <Route path="/metrics" element={
        <Suspense fallback={<LoadingFallback />}>
          <PublicMetrics />
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

function DevApp() {
  // AIDEV-NOTE: Development app with auth bypass for local Biomni testing
  return (
    <DevAuthProvider>
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
      <DevAppContent />
    </DevAuthProvider>
  )
}

export default DevApp