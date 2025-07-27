import React from 'react'
import { NavigationSidebar } from './NavigationSidebar'
import { TopBar } from './TopBar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background-primary overflow-hidden">
      {/* AIDEV-NOTE: Glass morphism sidebar with brand colors */}
      <NavigationSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full px-2 py-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}