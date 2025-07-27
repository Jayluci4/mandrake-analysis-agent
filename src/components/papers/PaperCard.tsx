import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ExternalLink, 
  Calendar, 
  Users, 
  Quote, 
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react'
import { Paper } from '@/types'
import { formatDate, formatNumber, cn } from '@/lib/utils'

interface PaperCardProps {
  paper: Paper
}

export function PaperCard({ paper }: PaperCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedDoi, setCopiedDoi] = useState(false)

  const handleCopyDoi = async () => {
    if (paper.doi) {
      await navigator.clipboard.writeText(paper.doi)
      setCopiedDoi(true)
      setTimeout(() => setCopiedDoi(false), 2000)
    }
  }

  // Ensure URL has proper protocol
  const getValidUrl = (url: string) => {
    if (!url) return '#'
    // If URL already has protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // If it's a DOI link without protocol
    if (url.startsWith('doi.org/') || url.includes('doi.org/')) {
      return `https://${url}`
    }
    // For PubMed IDs
    if (url.match(/^\d+$/)) {
      return `https://pubmed.ncbi.nlm.nih.gov/${url}/`
    }
    // Default to https
    return `https://${url}`
  }

  const getSourceColor = (source: string) => {
    const sourceColors: Record<string, string> = {
      pubmed: 'from-blue-500 to-blue-600',
      biorxiv: 'from-orange-500 to-orange-600',
      arxiv: 'from-red-500 to-red-600',
      'semantic scholar': 'from-purple-500 to-purple-600',
    }
    return sourceColors[source.toLowerCase()] || 'from-brand-400 to-brand-600'
  }

  return (
    <motion.div
      className="glass rounded-lg border border-border-subtle hover:border-brand-500/30 transition-all duration-300"
      whileHover={{ y: -2 }}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-text-primary line-clamp-2 flex-1">
            {paper.title}
          </h3>
          <a
            href={getValidUrl(paper.hyperlink)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-text-secondary hover:text-brand-400"
            title="View paper"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary mb-3">
          {/* Source Badge */}
          <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${getSourceColor(paper.source)} text-white`}>
            {paper.source}
          </div>

          {/* Authors */}
          {paper.authors.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{paper.authors[0]}{paper.authors.length > 1 && ` et al.`}</span>
            </div>
          )}

          {/* Date */}
          {paper.publication_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(paper.publication_date)}</span>
            </div>
          )}

          {/* Citations */}
          {paper.citations > 0 && (
            <div className="flex items-center gap-1">
              <Quote className="w-3 h-3" />
              <span>{formatNumber(paper.citations)} citations</span>
            </div>
          )}
        </div>

        {/* Journal & DOI */}
        <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
          {paper.journal && (
            <div className="flex items-center gap-1 text-text-secondary">
              <BookOpen className="w-3 h-3" />
              <span className="italic">{paper.journal}</span>
            </div>
          )}
          
          {paper.doi && (
            <button
              onClick={handleCopyDoi}
              className="flex items-center gap-1 text-text-muted hover:text-text-secondary transition-colors"
              title="Copy DOI"
            >
              {copiedDoi ? (
                <Check className="w-3 h-3 text-accent-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span className="font-mono text-[10px]">{paper.doi}</span>
            </button>
          )}
        </div>

        {/* Abstract Preview/Toggle */}
        {paper.abstract && (
          <>
            <div className={cn(
              "text-sm text-text-secondary leading-relaxed",
              !isExpanded && "line-clamp-3"
            )}>
              {paper.abstract}
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show more
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Hover Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand-500/5 to-accent-primary/5" />
      </motion.div>
    </motion.div>
  )
}