/**
 * Todo List Component
 * Displays and manages todo items with status tracking and animations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  XCircle,
  AlertCircle,
  CheckSquare,
  Circle,
  Play
} from 'lucide-react';
import type { TodoListProps, TodoItemProps } from '../../types/components';
import type { TodoItem } from '../../types/streaming';

// Individual Todo Item Component
const TodoItemComponent: React.FC<TodoItemProps> = ({
  todo,
  onUpdate,
  onDelete,
  draggable = false,
  className,
}) => {
  // Get status icon and color
  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'pending':
        return <Circle className="w-4 h-4 text-gray-400" />;
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TodoItem['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600 dark:text-gray-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400 line-through';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'blocked':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBackground = (status: TodoItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      case 'in_progress':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'blocked':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  // Handle status click to cycle through statuses
  const handleStatusClick = () => {
    if (!onUpdate) return;
    
    const statusCycle: TodoItem['status'][] = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusCycle.indexOf(todo.status);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];
    
    onUpdate({
      ...todo,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start space-x-3 p-3 border rounded-lg ${getStatusBackground(todo.status)} ${className || ''}`}
    >
      {/* Status Icon (clickable) */}
      <button
        onClick={handleStatusClick}
        className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
        disabled={!onUpdate}
        title={`Status: ${todo.status} (click to change)`}
      >
        {getStatusIcon(todo.status)}
      </button>

      {/* Todo Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${getStatusColor(todo.status)}`}>
          {todo.title}
        </p>
        
        {todo.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {todo.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
          {todo.created_at && (
            <span>
              Created: {new Date(todo.created_at).toLocaleTimeString()}
            </span>
          )}
          
          {todo.updated_at && todo.updated_at !== todo.created_at && (
            <span>
              Updated: {new Date(todo.updated_at).toLocaleTimeString()}
            </span>
          )}

          {todo.priority && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              todo.priority === 'high' 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : todo.priority === 'medium'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {todo.priority}
            </span>
          )}
        </div>
      </div>

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={() => onDelete(todo.id)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete todo"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

// Main TodoList Component
export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onUpdateTodo,
  onDeleteTodo,
  sortable = false,
  className,
}) => {
  // Sort todos by status and creation time
  const sortedTodos = React.useMemo(() => {
    if (!sortable) return todos;
    
    return [...todos].sort((a, b) => {
      // Status priority: in_progress > pending > blocked > failed > completed
      const statusPriority = {
        in_progress: 4,
        pending: 3,
        blocked: 2,
        failed: 1,
        completed: 0,
      };
      
      const aPriority = statusPriority[a.status] || 0;
      const bPriority = statusPriority[b.status] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If same status, sort by creation time (newest first)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [todos, sortable]);

  // Get status counts
  const statusCounts = React.useMemo(() => {
    return todos.reduce((acc, todo) => {
      acc[todo.status] = (acc[todo.status] || 0) + 1;
      return acc;
    }, {} as Record<TodoItem['status'], number>);
  }, [todos]);

  if (todos.length === 0) {
    return (
      <div className={`text-center py-6 ${className || ''}`}>
        <CheckSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tasks yet
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Status Summary */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
        {statusCounts.pending > 0 && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{statusCounts.pending} pending</span>
          </div>
        )}
        
        {statusCounts.in_progress > 0 && (
          <div className="flex items-center space-x-1">
            <PlayCircle className="w-3 h-3 text-blue-500" />
            <span>{statusCounts.in_progress} in progress</span>
          </div>
        )}
        
        {statusCounts.completed > 0 && (
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>{statusCounts.completed} completed</span>
          </div>
        )}
        
        {statusCounts.failed > 0 && (
          <div className="flex items-center space-x-1">
            <XCircle className="w-3 h-3 text-red-500" />
            <span>{statusCounts.failed} failed</span>
          </div>
        )}
        
        {statusCounts.blocked > 0 && (
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 text-yellow-500" />
            <span>{statusCounts.blocked} blocked</span>
          </div>
        )}
      </div>

      {/* Todo Items */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedTodos.map((todo) => (
            <TodoItemComponent
              key={todo.id}
              todo={todo}
              onUpdate={onUpdateTodo}
              onDelete={onDeleteTodo}
              draggable={sortable}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TodoList;