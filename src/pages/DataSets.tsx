import { Database, Upload, FileText, BarChart3, Download, Clock } from 'lucide-react'

export function DataSets() {
  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="pb-6 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Data Sets</h1>
            <p className="text-text-secondary">Manage and analyze your research data</p>
          </div>
          <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Upload Data</span>
          </button>
        </div>
      </div>

      {/* Data Categories */}
      <div className="grid grid-cols-4 gap-4 py-6">
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle hover:border-brand-400/50 transition-colors cursor-pointer">
          <FileText className="w-8 h-8 text-brand-400 mb-3" />
          <h3 className="font-medium text-text-primary mb-1">Genomic Data</h3>
          <p className="text-sm text-text-tertiary">12 datasets</p>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle hover:border-brand-400/50 transition-colors cursor-pointer">
          <BarChart3 className="w-8 h-8 text-accent-primary mb-3" />
          <h3 className="font-medium text-text-primary mb-1">Proteomics</h3>
          <p className="text-sm text-text-tertiary">8 datasets</p>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle hover:border-brand-400/50 transition-colors cursor-pointer">
          <Database className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="font-medium text-text-primary mb-1">Clinical Data</h3>
          <p className="text-sm text-text-tertiary">5 datasets</p>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle hover:border-brand-400/50 transition-colors cursor-pointer">
          <FileText className="w-8 h-8 text-green-400 mb-3" />
          <h3 className="font-medium text-text-primary mb-1">Lab Results</h3>
          <p className="text-sm text-text-tertiary">23 datasets</p>
        </div>
      </div>

      {/* Recent Datasets */}
      <div className="flex-1 overflow-y-auto custom-scrollbar opacity-20 pointer-events-none">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Datasets</h2>
        <div className="space-y-4">
          {/* Sample dataset cards */}
          {[1, 2].map((i) => (
            <div key={i} className="p-6 bg-background-secondary rounded-lg border border-border-subtle">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-500/10 rounded-lg">
                    <Database className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      Sample Dataset {i}
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                      Uploaded {i} days ago • {1.2 * i} GB • CSV format
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-text-tertiary">{12000 * i} rows</span>
                      <span className="text-text-tertiary">{50 * i} columns</span>
                      <button className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-background-tertiary hover:bg-background-primary border border-border-subtle rounded-lg text-sm transition-colors">
                  Analyze
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background-primary/80 backdrop-blur-sm">
        <div className="text-center p-8 glass rounded-xl border border-border-subtle max-w-md">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400/20 to-accent-primary/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Coming Soon
          </h2>
          <p className="text-text-secondary mb-4">
            The Data Management feature is under development. Soon you'll be able to:
          </p>
          <ul className="text-sm text-text-secondary space-y-2 text-left max-w-sm mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Upload and store research datasets securely</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Analyze data with AI-powered insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Visualize results with interactive charts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Share datasets with collaborators</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}