import { PaperGrid } from '../papers/PaperGrid'
import { Paper } from '@/types'
import { BookOpen } from 'lucide-react'

interface PapersPanelProps {
  papers: Paper[]
  isVisible: boolean
}

export function PapersPanel({ papers, isVisible }: PapersPanelProps) {
  if (!isVisible) {
    return null
  }

  return (
    <div className="h-full flex flex-col bg-background-elevated/30 border-l border-border-subtle">
      {/* Header */}
      <div className="p-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-text-primary">
            Research Papers
          </h2>
          <span className="text-sm text-text-tertiary bg-brand-500/10 px-2 py-1 rounded-full">
            {papers.length} found
          </span>
        </div>
      </div>

      {/* Papers Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {papers.length > 0 ? (
          <PaperGrid papers={papers} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen className="w-12 h-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">
              No papers found yet. Start a research query to see relevant papers here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}