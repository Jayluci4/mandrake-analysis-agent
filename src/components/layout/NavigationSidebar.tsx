import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { 
  Beaker, 
  MessageSquare, 
  BookOpen, 
  FlaskConical, 
  Database,
  Plus
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

export function NavigationSidebar() {
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
    <aside className="w-64 glass border-r border-border-subtle flex flex-col">
      {/* API Status Section */}
      <ApiStatus />

      {/* Quick Actions */}
      <div className="p-4 border-b border-border-subtle">
        <button 
          onClick={handleNewResearch}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Research</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4">
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
        <div className="flex-1 border-t border-border-subtle overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <ConversationHistory 
              key={refreshKey}
              onSelectConversation={handleSelectConversation}
              currentConversationId={currentConversationId || undefined}
            />
          </div>
        </div>
      )}
      {/* AIDEV-NOTE: User profile section removed as requested - navigation now ends with the nav items */}
    </aside>
  )
}