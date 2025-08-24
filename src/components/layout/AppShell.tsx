import React, { useState } from 'react'
import { NavigationSidebar } from './NavigationSidebar'
import { TopBar } from './TopBar'
import { motion } from 'framer-motion'

interface AppShellProps {
  children: React.ReactNode
  agentType?: 'research' | 'analysis'
}

export function AppShell({ children, agentType = 'research' }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#0f0e1d] overflow-hidden relative">
      {/* Background gradient effects - same as Welcome page */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-blue-600/5 pointer-events-none" />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/20 rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            animate={{ 
              y: -100,
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>
      {/* AIDEV-NOTE: Mobile menu overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* AIDEV-NOTE: Glass morphism sidebar with brand colors - now responsive */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 inset-y-0 left-0 lg:h-full transition-transform duration-300 ease-in-out`}>
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