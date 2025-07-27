import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Conversations, Literature, Experiments, DataSets, ConnectionTest } from './pages'
import { ConversationProvider } from './contexts/ConversationContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginScreen } from './components/auth/LoginScreen'

function AppContent() {
  const { isAuthenticated, login } = useAuth()

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onSuccess={login} />
  }

  // AIDEV-NOTE: Main routing configuration for the BioAgent app
  // All routes are wrapped in AppShell which provides the navigation sidebar
  // ConversationProvider allows global access to conversation control functions
  return (
    <ConversationProvider>
      <AppShell>
        <div className="h-full">
          <Routes>
            <Route path="/" element={<Conversations />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/datasets" element={<DataSets />} />
            <Route path="/test" element={<ConnectionTest />} />
          </Routes>
        </div>
      </AppShell>
    </ConversationProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App