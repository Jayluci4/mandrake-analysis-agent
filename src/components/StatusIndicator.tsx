import React from 'react'
import { motion } from 'framer-motion'
import { Dna, Loader2 } from 'lucide-react'

interface StatusIndicatorProps {
  isProcessing: boolean
  currentStreamingMessage: string
  connectionStatus: 'detecting' | 'ready' | 'connected' | 'error'
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isProcessing,
  currentStreamingMessage,
  connectionStatus
}) => {
  if (!isProcessing || currentStreamingMessage) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4"
    >
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Dna className="w-4 h-4 text-white" />
          </motion.div>
        </div>
        <div className="flex-1">
          <p className="text-gray-300">
            Analyzing your query...
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default StatusIndicator
