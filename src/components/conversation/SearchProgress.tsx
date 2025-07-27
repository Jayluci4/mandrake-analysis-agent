import { motion } from 'framer-motion'
import { Search, Database, Brain, FileText, Loader2 } from 'lucide-react'
import { ProgressUpdate } from '@/types'

interface SearchProgressProps {
  progress: ProgressUpdate | null
}

export function SearchProgress({ progress }: SearchProgressProps) {
  // Show initial loading state when no progress data is available yet
  if (!progress) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-lg p-3"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400/20 to-accent-primary/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-brand-400"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Initializing search...</p>
            <p className="text-xs text-text-secondary">Preparing to search research databases</p>
          </div>
        </div>
      </motion.div>
    )
  }
  const getIcon = (step: string) => {
    if (step.toLowerCase().includes('search')) return Search
    if (step.toLowerCase().includes('database')) return Database
    if (step.toLowerCase().includes('analyz')) return Brain
    return FileText
  }

  const Icon = getIcon(progress.current_step)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-lg p-3"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400/20 to-accent-primary/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand-400" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand-400"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{progress.current_step}</p>
          <p className="text-xs text-text-secondary">{progress.message}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-background-elevated rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-accent-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress.progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: [-80, 400],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-text-muted">
        <span>Progress</span>
        <span>{progress.progress}%</span>
      </div>
    </motion.div>
  )
}