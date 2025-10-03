import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ImageDisplay } from './ImageDisplay'

interface MessageBubbleProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    files?: { name: string; id: string }[]
    images?: string[]
    solution?: string
  }
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group ${
        message.role === 'user'
          ? 'bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20'
          : 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20'
      } backdrop-blur-sm rounded-lg p-4`}
    >
      <div className="flex items-start space-x-3">
        {message.role === 'user' ? (
          <User className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[15.5px]">M</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <div className="prose prose-base prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !className || !match
                  return !isInline && match ? (
                    <pre className="bg-black/50 backdrop-blur-sm text-gray-100 p-3 rounded-lg overflow-x-auto border border-white/10">
                      <code className={`language-${match[1]}`} {...props}>
                        {String(children).replace(/\n$/, '')}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-white/10 px-1 py-0.5 rounded text-[15.5px]" {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Display images */}
          {message.images && message.images.length > 0 && (
            <div className="mt-4">
              <ImageDisplay images={message.images} title="Visualizations" />
            </div>
          )}
        </div>
      </div>

      {/* Copy button - appears on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
        title="Copy message"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </motion.div>
  )
}

export default MessageBubble
