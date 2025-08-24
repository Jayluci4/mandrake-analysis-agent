import { motion } from 'framer-motion'
import { User, Bot, AlertCircle, Search, BookOpen, Database, TrendingUp, Microscope, Dna } from 'lucide-react'
import { Message } from './ConversationInterface'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageThreadProps {
  messages: Message[]
}

export function MessageThread({ messages }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        </div>

        {/* Main content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl w-full"
        >
          {/* Hero Section */}
          <div className="text-center mb-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-600/20 backdrop-blur-sm border border-cyan-500/20 mb-6"
            >
              <Microscope className="w-12 h-12 text-cyan-400" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Research Agent
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Your AI-powered research assistant for exploring biomedical literature, 
              analyzing scientific papers, and uncovering breakthrough insights.
            </p>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              <BookOpen className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-white font-semibold mb-2">Literature Review</h3>
              <p className="text-gray-400 text-sm">
                Search and analyze thousands of scientific papers from PubMed, bioRxiv, and other databases
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              <TrendingUp className="w-8 h-8 text-teal-400 mb-3" />
              <h3 className="text-white font-semibold mb-2">Trend Analysis</h3>
              <p className="text-gray-400 text-sm">
                Identify emerging research trends and breakthrough discoveries in your field
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              <Dna className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-white font-semibold mb-2">Deep Insights</h3>
              <p className="text-gray-400 text-sm">
                Generate comprehensive summaries and extract key findings from complex research
              </p>
            </motion.div>
          </div>

          {/* Example Queries */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-cyan-500/10 to-teal-600/10 backdrop-blur-md border border-cyan-500/20 rounded-xl p-6"
          >
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Try asking about:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Latest CRISPR gene editing techniques",
                "COVID-19 vaccine effectiveness studies",
                "Alzheimer's disease biomarkers",
                "Cancer immunotherapy breakthroughs"
              ].map((query, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-300">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  <span className="text-sm">{query}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2 sm:p-3">
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <MessageBubble message={message} />
        </motion.div>
      ))}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'

  return (
    <div className={cn(
      "flex gap-2",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser && "bg-gradient-to-br from-cyan-500 to-teal-600",
        message.type === 'ai' && "bg-gradient-to-br from-purple-500 to-pink-500",
        isSystem && "bg-red-500/20"
      )}>
        {isUser && <User className="w-4 h-4 text-white" />}
        {message.type === 'ai' && <Bot className="w-4 h-4 text-white" />}
        {isSystem && <AlertCircle className="w-4 h-4 text-red-400" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[85%]",
        isUser && "flex justify-end"
      )}>
        <div className={cn(
          "rounded-lg px-2 sm:px-3 py-1.5 sm:py-2",
          isUser && "bg-cyan-500/10 border border-cyan-500/20",
          message.type === 'ai' && "bg-white/5 backdrop-blur-md border border-white/10",
          isSystem && "bg-red-500/10 border border-red-500/20"
        )}>
          {isUser ? (
            <p className="text-white">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  p: ({ children }) => <p className="text-gray-200 mb-3 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-xl font-semibold text-white mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-white mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-200">{children}</li>,
                  code: ({ children, ...props }) => {
                    const isInline = !props.className?.includes('language-')
                    return isInline ? (
                      <code className="bg-black/50 px-1.5 py-0.5 rounded text-sm text-cyan-400 font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-black/50 p-3 rounded-lg text-sm font-mono overflow-x-auto text-cyan-400">
                        {children}
                      </code>
                    )
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-gray-400 my-3">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          
        </div>
        
        {/* Timestamp */}
        <p className={cn(
          "text-xs text-gray-500 mt-1",
          isUser && "text-right"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  )
}