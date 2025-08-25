// AIDEV-NOTE: Welcome page updated for Supabase authentication
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Brain, FlaskConical, ArrowRight, Sparkles, Microscope, Dna, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext'
import toast from 'react-hot-toast'

export function WelcomeSupabase() {
  const navigate = useNavigate()
  const { user, signOut } = useSupabaseAuth()
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const handleLogout = async () => {
    await signOut()
    toast.success('Logged out successfully')
  }
  
  const handleAgentSelect = (path: string, agentName: string) => {
    toast.success(`Opening ${agentName}...`, { 
      icon: '🚀',
      duration: 2000
    })
    navigate(path)
  }

  const agents = [
    {
      id: 'analysis',
      title: 'Analysis Agent',
      description: 'Advanced computational biology & protocol generation',
      icon: Brain,
      gradient: 'from-cyan-400/10 via-teal-500/10 to-blue-600/10',
      borderGradient: 'from-cyan-400/40 via-teal-500/40 to-blue-600/40',
      features: [
        'Tool orchestration',
        'Protocol generation',
        'Data visualization',
        'Code generation'
      ],
      path: '/analysis'
    },
    {
      id: 'research',
      title: 'Research Agent',
      description: 'Literature search & research synthesis powered by AI',
      icon: FlaskConical,
      gradient: 'from-emerald-400/10 via-green-500/10 to-teal-600/10',
      borderGradient: 'from-emerald-400/40 via-green-500/40 to-teal-600/40',
      features: [
        'Literature search',
        'Paper analysis',
        'Research synthesis',
        'Citation management'
      ],
      path: '/research'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0f0e1d] text-white overflow-hidden relative">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-blue-600/5" />
      
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{ 
              y: -100,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/20"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-end">
            {user && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <span className="text-sm text-gray-300">
                    {user.name}
                  </span>
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-7 h-7 rounded-full border border-white/20"
                    />
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all duration-300 text-sm"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          {/* Centered Mandrake Bio Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-12"
          >
            <img
              src="/assets/asset-logo.png"
              alt="Mandrake Bio"
              className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain"
            />
          </motion.div>
          
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 mb-8"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400">AI-Powered Research Platform</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-light mb-8 leading-tight">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500">
              AI Co-Scientist
            </span> for Biological Discoveries
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
            {user ? `Welcome back, ${user.name}!` : 'Welcome!'} Choose your specialized AI agent to accelerate discovery, 
            analyze complex data, and unlock new insights in biomedicine.
          </p>
        </motion.div>

        {/* Agent Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -5 }}
              onHoverStart={() => setHoveredCard(agent.id)}
              onHoverEnd={() => setHoveredCard(null)}
              className="relative group"
            >
              {/* Gradient border effect */}
              <div className={`absolute inset-0 bg-gradient-to-r ${agent.borderGradient} rounded-2xl opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-500`} />
              
              <button
                onClick={() => handleAgentSelect(agent.path, agent.title)}
                className="relative w-full p-8 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 text-left overflow-hidden"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon and Title */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                        <agent.icon className="w-7 h-7 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-light mb-1">
                          {agent.title}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-600 transition-all duration-300 ${
                      hoveredCard === agent.id ? 'translate-x-1 text-cyan-400' : ''
                    }`} />
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {agent.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1 h-1 rounded-full bg-cyan-400/60" />
                        <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Launch Button */}
                  <div className="flex items-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-sm font-medium">Launch Agent</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <Dna className="w-20 h-20 text-cyan-400 animate-pulse" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20">
          <Microscope className="w-24 h-24 text-teal-400 animate-pulse" />
        </div>
      </div>
    </div>
  )
}