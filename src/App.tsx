import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Conversations, Literature, Experiments, DataSets } from './pages'
import { ConversationProvider } from './contexts/ConversationContext'

function App() {
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
          </Routes>
        </div>
      </AppShell>
    </ConversationProvider>
  )
}

export default App