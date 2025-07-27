import { BookOpen, Search, Filter, Download } from 'lucide-react'

export function Literature() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-6 border-b border-border-subtle">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Literature</h1>
        <p className="text-text-secondary">Browse and manage your research papers and references</p>
      </div>

      {/* Search and Filters */}
      <div className="py-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search papers by title, author, or keyword..."
            className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border-subtle rounded-lg focus:outline-none focus:border-brand-400 transition-colors"
          />
        </div>
        <button className="px-4 py-2 bg-background-secondary border border-border-subtle rounded-lg hover:bg-background-tertiary transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid gap-4">
          {/* Placeholder for papers */}
          <div className="p-6 bg-background-secondary rounded-lg border border-border-subtle">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-500/10 rounded-lg">
                <BookOpen className="w-6 h-6 text-brand-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Sample Research Paper Title
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  Authors: John Doe, Jane Smith, et al.
                </p>
                <p className="text-sm text-text-tertiary line-clamp-2 mb-3">
                  This is a placeholder abstract for a research paper. In a real implementation, 
                  this would show the actual abstract of the paper...
                </p>
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <span>Published: 2024</span>
                  <span>Citations: 42</span>
                  <button className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No papers yet</h3>
              <p className="text-text-secondary max-w-md">
                Start adding research papers to your library. They'll appear here for easy access and reference.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}