import { Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export function Experiments() {
  return (
    <div className="h-full flex flex-col relative">
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
      <div className="flex-1 overflow-y-auto custom-scrollbar opacity-20 pointer-events-none">
        <div className="space-y-4">
          {/* Sample experiment cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-background-secondary rounded-lg border border-border-subtle">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    Sample Experiment #{40 + i}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Started {i} days ago • Est. completion in {7 - i} days
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm">
                  <Clock className="w-3 h-3" />
                  In Progress
                </div>
              </div>
              <p className="text-text-secondary mb-4">
                Testing various conditions for optimal results...
              </p>
              <div className="flex items-center gap-6 text-sm text-text-tertiary">
                <span>Protocol: Sample Protocol</span>
                <span>Samples: {12 * i}</span>
                <span>Progress: {25 * i}%</span>
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
            The Experiment Tracking feature is under development. Soon you'll be able to:
          </p>
          <ul className="text-sm text-text-secondary space-y-2 text-left max-w-sm mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Design and track experiments with AI assistance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Log protocols, observations, and results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Generate automated lab reports</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>Collaborate with team members in real-time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}