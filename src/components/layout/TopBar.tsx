import React, { useState, useEffect } from 'react'
import { Search, Bell, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  // AIDEV-NOTE: Handle search functionality with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('search-input') as HTMLInputElement
        searchInput?.focus()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    // AIDEV-TODO: Implement actual search functionality - could trigger global search across conversations, papers, etc.
  }

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
    alert('Notifications feature coming soon! You will receive updates about research progress and new publications.')
  }
  return (
    <header className="h-16 glass border-b border-border-subtle flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search experiments, papers, or ask a question..."
              className="w-full pl-10 pr-4 py-2 bg-background-elevated/50 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-text-tertiary">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleNotificationClick}
            className="relative p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-primary rounded-full"></span>
          </button>
        </div>
      </div>
      
      {/* Logo - positioned at extreme right */}
      <img 
        src="/Mandrake Bioworks Logo.png" 
        alt="Mandrake Bio" 
        className="w-auto object-contain"
        style={{ height: '150px' }}
      />
    </header>
  )
}