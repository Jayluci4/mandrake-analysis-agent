import { motion } from 'framer-motion'
import { Paper } from '@/types'
import { PaperCard } from './PaperCard'

interface PaperGridProps {
  papers: Paper[]
}

export function PaperGrid({ papers }: PaperGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {papers.map((paper, index) => (
        <motion.div
          key={`${paper.doi || paper.hyperlink}-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <PaperCard paper={paper} />
        </motion.div>
      ))}
    </div>
  )
}