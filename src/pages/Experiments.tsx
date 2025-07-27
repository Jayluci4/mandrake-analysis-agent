import { FlaskConical, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export function Experiments() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-6 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Experiments</h1>
            <p className="text-text-secondary">Track and manage your lab experiments</p>
          </div>
          <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Experiment</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 py-6">
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">3</p>
              <p className="text-sm text-text-secondary">In Progress</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">12</p>
              <p className="text-sm text-text-secondary">Completed</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">1</p>
              <p className="text-sm text-text-secondary">Needs Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Experiments List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          {/* Sample experiment card */}
          <div className="p-6 bg-background-secondary rounded-lg border border-border-subtle hover:border-brand-400/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Protein Expression Study #42
                </h3>
                <p className="text-sm text-text-secondary">
                  Started 2 days ago • Est. completion in 5 days
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm">
                <Clock className="w-3 h-3" />
                In Progress
              </div>
            </div>
            <p className="text-text-secondary mb-4">
              Testing the expression levels of target protein under various conditions...
            </p>
            <div className="flex items-center gap-6 text-sm text-text-tertiary">
              <span>Protocol: Western Blot</span>
              <span>Samples: 24</span>
              <span>Progress: 35%</span>
            </div>
          </div>

          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <FlaskConical className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No experiments yet</h3>
              <p className="text-text-secondary max-w-md">
                Start tracking your experiments here. You can log protocols, results, and observations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}