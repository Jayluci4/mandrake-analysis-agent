import React from 'react'
import { Database, Upload, FileText, BarChart3, Download } from 'lucide-react'

export function DataSets() {
  return (
    <div className="h-full flex flex-col">
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
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Datasets</h2>
        <div className="space-y-4">
          {/* Sample dataset card */}
          <div className="p-6 bg-background-secondary rounded-lg border border-border-subtle hover:border-brand-400/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-500/10 rounded-lg">
                  <Database className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    RNA-Seq Results - Experiment 42
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Uploaded 3 days ago • 2.4 GB • CSV format
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-tertiary">24,567 rows</span>
                    <span className="text-text-tertiary">145 columns</span>
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

          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <Database className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No datasets uploaded</h3>
              <p className="text-text-secondary max-w-md">
                Upload your research data to store, manage, and analyze it with AI assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}