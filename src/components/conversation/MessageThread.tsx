import { motion } from 'framer-motion'
import { User, Bot, AlertCircle } from 'lucide-react'
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
      <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400/20 to-accent-primary/20 flex items-center justify-center mb-4">
          <Bot className="w-10 h-10 text-brand-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-2">
          Ready to Research
        </h2>
        <p className="text-sm sm:text-base text-text-secondary max-w-md">
          Your AI Co-Scientist is ready to help with biological and medical research. 
          Ask me about any research topic, and I'll search through scientific literature to provide comprehensive analysis.
        </p>
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
        isUser && "bg-gradient-to-br from-brand-400 to-brand-600",
        message.type === 'ai' && "bg-gradient-to-br from-accent-secondary to-accent-primary",
        isSystem && "bg-accent-error/20"
      )}>
        {isUser && <User className="w-4 h-4 text-white" />}
        {message.type === 'ai' && <Bot className="w-4 h-4 text-white" />}
        {isSystem && <AlertCircle className="w-4 h-4 text-accent-error" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[85%]",
        isUser && "flex justify-end"
      )}>
        <div className={cn(
          "rounded-lg px-2 sm:px-3 py-1.5 sm:py-2",
          isUser && "bg-brand-500/10 border border-brand-500/20",
          message.type === 'ai' && "glass",
          isSystem && "bg-accent-error/10 border border-accent-error/20"
        )}>
          {isUser ? (
            <p className="text-text-primary">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  p: ({ children }) => <p className="text-text-primary mb-3 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-xl font-semibold text-text-primary mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-text-primary mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-text-primary mb-2">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
                  li: ({ children }) => <li className="text-text-primary">{children}</li>,
                  code: ({ children, ...props }) => {
                    const isInline = !props.className?.includes('language-')
                    return isInline ? (
                      <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-sm text-accent-primary font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-surface-elevated p-3 rounded-lg text-sm font-mono overflow-x-auto">
                        {children}
                      </code>
                    )
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-brand-500 pl-4 italic text-text-secondary my-3">
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
          "text-xs text-text-muted mt-1",
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