import React, { useState } from 'react'
import { NavigationSidebar } from './NavigationSidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background-primary overflow-hidden relative">
      {/* AIDEV-NOTE: Mobile menu overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* AIDEV-NOTE: Glass morphism sidebar with brand colors - now responsive */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 h-screen lg:h-full transition-transform duration-300 ease-in-out`}>
        <NavigationSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full px-2 py-2 md:px-4 md:py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}