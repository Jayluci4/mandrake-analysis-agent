import { BookOpen, Search, Filter, Download, Clock } from 'lucide-react'

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
        {/* Coming Soon Overlay */}
        <div className="relative h-full">
          {/* Background Preview */}
          <div className="grid gap-4 opacity-20 pointer-events-none">
            {/* Sample papers */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-background-secondary rounded-lg border border-border-subtle">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-500/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      Sample Research Paper Title {i}
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
                      <span>Citations: {42 * i}</span>
                      <button className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Coming Soon Message */}
          <div className="absolute inset-0 flex items-center justify-center bg-background-primary/80 backdrop-blur-sm">
            <div className="text-center p-8 glass rounded-xl border border-border-subtle max-w-md">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400/20 to-accent-primary/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-brand-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Coming Soon
              </h2>
              <p className="text-text-secondary mb-4">
                The Literature Library feature is under development. Soon you'll be able to:
              </p>
              <ul className="text-sm text-text-secondary space-y-2 text-left max-w-sm mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">•</span>
                  <span>Save and organize research papers from your searches</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">•</span>
                  <span>Create collections and reading lists</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">•</span>
                  <span>Export citations in various formats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400">•</span>
                  <span>Collaborate with team members on literature reviews</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}