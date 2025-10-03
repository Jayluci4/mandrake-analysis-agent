/**
 * Enhanced Todo List Renderer for Biomni Integration
 * Real-time todo updates with rich metadata and progress tracking
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  Clock, 
  Code, 
  FileText, 
  Beaker, 
  Brain,
  ChevronDown,
  ChevronRight,
  Progress
} from 'lucide-react'

// Enhanced todo item interface
interface EnhancedTodoItem {
  id: number
  text: string
  completed: boolean
  
  // Biomni enhancements
  original_status?: string
  source?: 'biomni' | 'default'
  step_number?: number
  estimated_complexity?: string
  has_code_execution?: boolean
  has_file_operations?: boolean
  completion_source?: string
  completion_timestamp?: string
  metadata?: Record<string, any>
}

interface TodoProgressStats {
  total: number
  completed: number
  pending: number
  percentage: number
  biomniTodos: number
  hasCodeTodos: number
  hasFileTodos: number
}

interface EnhancedTodoRendererProps {
  todos: EnhancedTodoItem[]
  onTodoUpdate?: (todos: EnhancedTodoItem[]) => void
  showMetadata?: boolean
  compactMode?: boolean
}

const EnhancedTodoRenderer: React.FC<EnhancedTodoRendererProps> = ({
  todos,
  onTodoUpdate,
  showMetadata = true,
  compactMode = false
}) => {
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set())
  const [progressStats, setProgressStats] = useState<TodoProgressStats>({
    total: 0,
    completed: 0,
    pending: 0,
    percentage: 0,
    biomniTodos: 0,
    hasCodeTodos: 0,
    hasFileTodos: 0
  })

  // Calculate progress statistics
  useEffect(() => {
    const stats: TodoProgressStats = {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length,
      percentage: todos.length > 0 ? (todos.filter(t => t.completed).length / todos.length) * 100 : 0,
      biomniTodos: todos.filter(t => t.source === 'biomni').length,
      hasCodeTodos: todos.filter(t => t.has_code_execution).length,
      hasFileTodos: todos.filter(t => t.has_file_operations).length
    }
    
    setProgressStats(stats)
  }, [todos])

  // Toggle todo expansion
  const toggleTodoExpansion = (todoId: number) => {
    setExpandedTodos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(todoId)) {
        newSet.delete(todoId)
      } else {
        newSet.add(todoId)
      }
      return newSet
    })
  }

  // Get todo icon based on type and status
  const getTodoIcon = (todo: EnhancedTodoItem) => {
    if (todo.completed) {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    }
    
    if (todo.has_code_execution) {
      return <Code className="w-4 h-4 text-blue-400" />
    }
    
    if (todo.has_file_operations) {
      return <FileText className="w-4 h-4 text-purple-400" />
    }
    
    if (todo.source === 'biomni') {
      return <Beaker className="w-4 h-4 text-cyan-400" />
    }
    
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  // Get complexity indicator
  const getComplexityIndicator = (complexity?: string) => {
    if (!complexity) return null
    
    const colors = {
      'simple': 'bg-green-500',
      'moderate': 'bg-yellow-500', 
      'complex': 'bg-red-500'
    }
    
    return (
      <div className={`w-2 h-2 rounded-full ${colors[complexity] || 'bg-gray-500'}`} title={`${complexity} complexity`} />
    )
  }

  if (!todos.length) {
    return (
      <div className="text-center py-6">
        <Brain className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">No tasks yet</p>
        <p className="text-gray-500 text-xs">Tasks will appear here as the agent creates a plan</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-300 text-sm">Task Progress</h4>
          <span className="text-xs text-gray-400">
            {progressStats.completed}/{progressStats.total}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <motion.div
            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressStats.percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        {/* Progress stats */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {progressStats.percentage.toFixed(1)}% Complete
          </span>
          
          {showMetadata && (
            <div className="flex items-center space-x-2">
              {progressStats.biomniTodos > 0 && (
                <span className="text-cyan-400">🧬 {progressStats.biomniTodos}</span>
              )}
              {progressStats.hasCodeTodos > 0 && (
                <span className="text-blue-400">⚙️ {progressStats.hasCodeTodos}</span>
              )}
              {progressStats.hasFileTodos > 0 && (
                <span className="text-purple-400">📁 {progressStats.hasFileTodos}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Todo List */}
      <div className="space-y-2">
        <AnimatePresence>
          {todos.map((todo, index) => (
            <motion.div
              key={todo.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`rounded-lg border backdrop-blur-sm transition-all duration-200 ${
                todo.completed 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-white/5 border-white/10 hover:border-cyan-500/30'
              }`}
            >
              <div 
                className="p-3 cursor-pointer"
                onClick={() => showMetadata && toggleTodoExpansion(todo.id)}
              >
                <div className="flex items-start space-x-3">
                  {/* Todo icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getTodoIcon(todo)}
                  </div>
                  
                  {/* Todo content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        todo.completed 
                          ? 'text-green-400 line-through' 
                          : 'text-gray-200'
                      }`}>
                        {todo.text}
                      </span>
                      
                      {/* Metadata indicators */}
                      {showMetadata && (
                        <div className="flex items-center space-x-1">
                          {getComplexityIndicator(todo.estimated_complexity)}
                          
                          {todo.source === 'biomni' && (
                            <div className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                              B
                            </div>
                          )}
                          
                          {todo.step_number && (
                            <span className="text-xs text-gray-500">
                              #{todo.step_number}
                            </span>
                          )}
                          
                          {showMetadata && todo.metadata && (
                            expandedTodos.has(todo.id) ? 
                              <ChevronDown className="w-3 h-3 text-gray-400" /> : 
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced metadata display */}
                    {showMetadata && expandedTodos.has(todo.id) && todo.metadata && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pt-2 border-t border-white/10"
                      >
                        <div className="text-xs text-gray-400 space-y-1">
                          {todo.estimated_complexity && (
                            <div>Complexity: {todo.estimated_complexity}</div>
                          )}
                          
                          {todo.has_code_execution && (
                            <div className="flex items-center space-x-1">
                              <Code className="w-3 h-3" />
                              <span>Involves code execution</span>
                            </div>
                          )}
                          
                          {todo.has_file_operations && (
                            <div className="flex items-center space-x-1">
                              <FileText className="w-3 h-3" />
                              <span>Involves file operations</span>
                            </div>
                          )}
                          
                          {todo.completion_timestamp && (
                            <div>
                              Completed: {new Date(todo.completion_timestamp).toLocaleTimeString()}
                            </div>
                          )}
                          
                          {todo.completion_source && (
                            <div>Source: {todo.completion_source}</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick stats footer */}
      {!compactMode && progressStats.total > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2">
          {progressStats.completed > 0 && (
            <span>✅ {progressStats.completed} completed</span>
          )}
          {progressStats.pending > 0 && (
            <span className="ml-2">⏳ {progressStats.pending} pending</span>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for real-time todo updates
export const useBiomniTodoUpdates = (initialTodos: EnhancedTodoItem[] = []) => {
  const [todos, setTodos] = useState<EnhancedTodoItem[]>(initialTodos)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  // Update todos from Biomni planning events
  const updateTodosFromBiomni = (planningData: any) => {
    console.log('🔄 Updating todos from Biomni planning event:', planningData)
    
    if (planningData.steps && Array.isArray(planningData.steps)) {
      const enhancedTodos: EnhancedTodoItem[] = planningData.steps.map((step: any, index: number) => ({
        id: step.id || index + 1,
        text: typeof step === 'string' ? step : step.step || step.description || '',
        completed: step.status === 'completed',
        
        // Biomni enhancements
        original_status: step.status,
        source: 'biomni',
        step_number: step.step_number || index + 1,
        estimated_complexity: step.complexity || 'unknown',
        has_code_execution: step.involves_code || false,
        has_file_operations: step.involves_files || false,
        completion_source: step.completed ? 'biomni' : undefined,
        completion_timestamp: step.completed ? new Date().toISOString() : undefined,
        metadata: {
          original_data: step,
          update_source: 'biomni_planning',
          timestamp: planningData.timestamp
        }
      }))
      
      setTodos(enhancedTodos)
      setLastUpdateTime(new Date())
      
      console.log(`✅ Updated ${enhancedTodos.length} todos from Biomni`)
    }
  }

  // Mark specific todo as completed
  const markTodoCompleted = (todoId: number, completionSource = 'manual') => {
    setTodos(prev => prev.map(todo => 
      todo.id === todoId 
        ? { 
            ...todo, 
            completed: true,
            completion_source: completionSource,
            completion_timestamp: new Date().toISOString()
          }
        : todo
    ))
    setLastUpdateTime(new Date())
  }

  // Add new todo
  const addTodo = (text: string, metadata: Partial<EnhancedTodoItem> = {}) => {
    const newTodo: EnhancedTodoItem = {
      id: Date.now(),
      text,
      completed: false,
      source: 'biomni',
      step_number: todos.length + 1,
      ...metadata
    }
    
    setTodos(prev => [...prev, newTodo])
    setLastUpdateTime(new Date())
  }

  // Get progress statistics
  const getProgressStats = (): TodoProgressStats => {
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length,
      percentage: todos.length > 0 ? (todos.filter(t => t.completed).length / todos.length) * 100 : 0,
      biomniTodos: todos.filter(t => t.source === 'biomni').length,
      hasCodeTodos: todos.filter(t => t.has_code_execution).length,
      hasFileTodos: todos.filter(t => t.has_file_operations).length
    }
  }

  return {
    todos,
    setTodos,
    updateTodosFromBiomni,
    markTodoCompleted,
    addTodo,
    getProgressStats,
    lastUpdateTime
  }
}

// Todo update manager for handling Biomni events
export class BiomniTodoManager {
  private todos: EnhancedTodoItem[] = []
  private updateCallback?: (todos: EnhancedTodoItem[]) => void
  private lastPlanningEventHash: string = ''

  constructor(updateCallback?: (todos: EnhancedTodoItem[]) => void) {
    this.updateCallback = updateCallback
  }

  // Process planning event from Biomni bridge
  processPlanningEvent(planningEventData: any): void {
    console.log('📋 Processing Biomni planning event:', planningEventData)
    
    // Avoid duplicate processing
    const eventHash = JSON.stringify(planningEventData.steps)
    if (eventHash === this.lastPlanningEventHash) {
      console.log('⏭️ Skipping duplicate planning event')
      return
    }
    this.lastPlanningEventHash = eventHash

    if (planningEventData.steps && Array.isArray(planningEventData.steps)) {
      const enhancedTodos: EnhancedTodoItem[] = planningEventData.steps.map((step: any, index: number) => ({
        id: step.id || index + 1,
        text: typeof step === 'string' ? step : step.step || step.description || '',
        completed: step.status === 'completed',
        
        // Enhanced Biomni metadata
        original_status: step.status,
        source: 'biomni',
        step_number: step.step_number || index + 1,
        estimated_complexity: this.detectComplexity(step),
        has_code_execution: this.detectCodeInvolvement(step),
        has_file_operations: this.detectFileInvolvement(step),
        completion_source: step.status === 'completed' ? 'biomni' : undefined,
        completion_timestamp: step.status === 'completed' ? new Date().toISOString() : undefined,
        metadata: {
          original_step_data: step,
          event_timestamp: planningEventData.timestamp,
          update_source: 'biomni_planning_event'
        }
      }))
      
      this.todos = enhancedTodos
      
      if (this.updateCallback) {
        this.updateCallback(this.todos)
      }
      
      console.log(`✅ Updated ${enhancedTodos.length} todos from Biomni planning event`)
    }
  }

  // Detect complexity from step description
  private detectComplexity(step: any): string {
    const text = (typeof step === 'string' ? step : step.step || step.description || '').toLowerCase()
    
    if (text.includes('design') || text.includes('create') || text.includes('analyze')) {
      return 'complex'
    } else if (text.includes('calculate') || text.includes('process') || text.includes('generate')) {
      return 'moderate'
    } else {
      return 'simple'
    }
  }

  // Detect if step involves code execution
  private detectCodeInvolvement(step: any): boolean {
    const text = (typeof step === 'string' ? step : step.step || step.description || '').toLowerCase()
    return text.includes('code') || text.includes('execute') || text.includes('script') || text.includes('calculate')
  }

  // Detect if step involves file operations
  private detectFileInvolvement(step: any): boolean {
    const text = (typeof step === 'string' ? step : step.step || step.description || '').toLowerCase()
    return text.includes('file') || text.includes('save') || text.includes('write') || text.includes('create') || text.includes('download')
  }

  // Get current todos
  getTodos(): EnhancedTodoItem[] {
    return this.todos
  }

  // Manual todo completion (for user interaction)
  markCompleted(todoId: number): void {
    this.todos = this.todos.map(todo =>
      todo.id === todoId
        ? {
            ...todo,
            completed: true,
            completion_source: 'user_manual',
            completion_timestamp: new Date().toISOString()
          }
        : todo
    )
    
    if (this.updateCallback) {
      this.updateCallback(this.todos)
    }
  }

  // Reset todos for new session
  reset(): void {
    this.todos = []
    this.lastPlanningEventHash = ''
    
    if (this.updateCallback) {
      this.updateCallback(this.todos)
    }
  }

  // Get progress summary
  getProgressSummary(): TodoProgressStats {
    return {
      total: this.todos.length,
      completed: this.todos.filter(t => t.completed).length,
      pending: this.todos.filter(t => !t.completed).length,
      percentage: this.todos.length > 0 ? (this.todos.filter(t => t.completed).length / this.todos.length) * 100 : 0,
      biomniTodos: this.todos.filter(t => t.source === 'biomni').length,
      hasCodeTodos: this.todos.filter(t => t.has_code_execution).length,
      hasFileTodos: this.todos.filter(t => t.has_file_operations).length
    }
  }
}

export default EnhancedTodoRenderer