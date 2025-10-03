import React from 'react'
import { motion } from 'framer-motion'
import { 
  Code, Eye, Target, FileText, Image, ChevronDown, ChevronRight
} from 'lucide-react'
import { ImageDisplay } from './ImageDisplay'

interface ExecutionEvent {
  type: string
  content?: string
  timestamp: Date
  expanded?: boolean
  metadata?: any
}

interface ExecutionLogProps {
  executionEvents: ExecutionEvent[]
  onToggleExpansion: (index: number) => void
}

const ExecutionLog: React.FC<ExecutionLogProps> = ({
  executionEvents,
  onToggleExpansion
}) => {
  if (executionEvents.length === 0) return null

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tool_call':
        return <Code className="w-4 h-4 text-green-400" />
      case 'observation':
        return <Eye className="w-4 h-4 text-purple-400" />
      case 'planning':
        return <Target className="w-4 h-4 text-blue-400" />
      case 'file_operation':
        return <FileText className="w-4 h-4 text-cyan-400" />
      case 'visualization':
        return <Image className="w-4 h-4 text-pink-400" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const getEventStyles = (type: string) => {
    switch (type) {
      case 'tool_call':
        return 'bg-green-500/10 border-green-500/20'
      case 'observation':
        return 'bg-purple-500/10 border-purple-500/20'
      case 'planning':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'file_operation':
        return 'bg-cyan-500/10 border-cyan-500/20'
      case 'visualization':
        return 'bg-pink-500/10 border-pink-500/20'
      default:
        return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-300">Execution Log</h4>
      {executionEvents.map((event, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`rounded-md p-3 backdrop-blur-sm border ${getEventStyles(event.type)}`}
        >
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => onToggleExpansion(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleExpansion(index)
              }
            }}
            aria-expanded={event.expanded}
            aria-label={`Toggle ${event.type} details`}
          >
            <div className="flex items-center space-x-2">
              {getEventIcon(event.type)}
              <span className="font-medium text-sm capitalize text-gray-200">
                {event.type.replace('_', ' ')}
              </span>
            </div>
            
            {event.content && event.content.length > 50 && (
              event.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </div>
          
          {event.content && (
            <div className={`mt-2 text-xs text-gray-300 ${
              !event.expanded && event.content.length > 100 ? 'line-clamp-2' : ''
            }`}>
              {event.type === 'tool_call' ? (
                <div>
                  <pre className="whitespace-pre-wrap font-mono bg-black/30 p-2 rounded">
                    <code className="language-python">{event.content}</code>
                  </pre>
                  {event.metadata?.variables && (
                    <div className="mt-1 text-xs text-gray-400">
                      Variables: {event.metadata.variables.join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono">{event.content}</pre>
              )}
            </div>
          )}
          
          {/* Image display for visualizations */}
          {event.type === 'visualization' && event.metadata?.images && (
            <div className="mt-3">
              <ImageDisplay 
                images={event.metadata.images} 
                title={event.metadata.caption || 'Plots'} 
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

export default ExecutionLog
