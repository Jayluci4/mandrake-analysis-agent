import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { 
  MessageSquare, 
  BookOpen, 
  FlaskConical, 
  Database,
  Plus,
  X,
  Brain,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConversation } from '@/contexts/ConversationContext'
import { ConversationHistory } from '@/components/conversation/ConversationHistory'
import { SavedConversation } from '@/lib/conversationStorage'
import { ApiStatus } from './ApiStatus'

const navItems = [
  { icon: MessageSquare, label: 'Conversations', href: '/' },
  { icon: BookOpen, label: 'Literature', href: '/literature' },
  { icon: FlaskConical, label: 'Experiments', href: '/experiments' },
  { icon: Database, label: 'Data Sets', href: '/datasets' },
]

interface NavigationSidebarProps {
  onClose?: () => void
}

export function NavigationSidebar({ onClose }: NavigationSidebarProps) {
  // AIDEV-NOTE: Using React Router's NavLink for client-side navigation
  // The isActive prop automatically handles active state styling
  const navigate = useNavigate()
  const location = useLocation()
  const { clearConversation, loadConversation, currentConversationId } = useConversation()
  const [refreshKey, setRefreshKey] = useState(0)
  
  // AIDEV-NOTE: Handle New Research button - navigate to conversations page and clear conversation
  // This provides a quick way for users to start a fresh research query from anywhere in the app
  const handleNewResearch = () => {
    if (location.pathname !== '/') {
      navigate('/')
    }
    // Clear conversation after navigation or immediately if already on conversations page
    setTimeout(() => {
      clearConversation()
      // Force refresh of conversation history
      setRefreshKey(prev => prev + 1)
    }, 0)
  }

  // AIDEV-NOTE: Handle selecting a conversation from history
  const handleSelectConversation = (conversation: SavedConversation) => {
    if (location.pathname !== '/') {
      navigate('/')
    }
    // Load the conversation after navigation
    setTimeout(() => loadConversation(conversation), 0)
  }
  
  return (
    <aside className="w-64 h-full glass lg:border-r border-border-subtle flex flex-col lg:overflow-visible">
      {/* Mobile close button - Fixed at top */}
      <div className="lg:hidden flex justify-end p-4 border-b border-border-subtle flex-shrink-0 sticky top-0 bg-background-primary z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
      
      {/* Scrollable content wrapper for mobile */}
      <div className="flex-1 overflow-y-auto lg:overflow-visible lg:flex lg:flex-col custom-scrollbar">
        {/* API Status Section */}
        <div className="lg:flex-shrink-0">
          <ApiStatus />
        </div>

        {/* Agent Switcher */}
        <div className="p-4 border-b border-border-subtle lg:flex-shrink-0">
          <div className="space-y-2">
            {/* Analysis Agent (Biomni) Button */}
            <button 
              onClick={() => {
                // Open Biomni app in same tab/window
                // Note: Update port if Biomni runs on different port
                window.location.href = 'http://localhost:5174'
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
              title="Switch to Biomni Analysis Agent for general biomedical AI tasks"
            >
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">Analysis Agent</span>
            </button>
            
            {/* Research Agent (Current BioAgent) Button */}
            <button 
              onClick={handleNewResearch}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 relative ring-2 ring-blue-400 ring-opacity-50"
              title="New Research Session (Currently Active)"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm font-medium">Research Agent</span>
              {/* Active indicator */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </button>
          </div>
          
          {/* Small description text */}
          <div className="mt-3 text-xs text-text-tertiary text-center space-y-1">
            <p className="font-medium">Research Agent Active</p>
            <p className="opacity-75">Click to start new session</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 lg:flex-shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-brand-500/10 text-brand-400 glass-hover" 
                        : "text-text-secondary hover:text-text-primary hover:bg-white/[0.02]"
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Conversation History - only show on conversations page */}
        {location.pathname === '/' && (
          <div className="lg:flex-1 lg:min-h-0 border-t border-border-subtle lg:overflow-hidden pb-4">
            <div className="lg:h-full lg:overflow-y-auto custom-scrollbar py-4">
              <ConversationHistory 
                key={refreshKey}
                onSelectConversation={handleSelectConversation}
                currentConversationId={currentConversationId || undefined}
              />
            </div>
          </div>
        )}
      </div>
      {/* AIDEV-NOTE: User profile section removed as requested - navigation now ends with the nav items */}
    </aside>
  )
}