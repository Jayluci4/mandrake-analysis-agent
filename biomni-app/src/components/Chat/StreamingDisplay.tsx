/**
 * Streaming Display Component
 * Shows real-time streaming events from LangGraph execution
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Brain, 
  Code, 
  Terminal,
  Eye,
  BarChart3,
  CheckSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Loader2
} from 'lucide-react';
import { CodeBlock } from '../Code/CodeBlock';
import { TodoList } from '../Todo/TodoList';
import { VisualizationPanel } from '../Visualization/VisualizationPanel';
import { useSettings } from '../../stores/uiStore';
import { useTodos } from '../../stores/chatStore';
import type { StreamingDisplayProps } from '../../types/components';
import type { StreamEvent } from '../../types/streaming';

export const StreamingDisplay: React.FC<StreamingDisplayProps> = ({
  events,
  isStreaming,
  expandedSections = new Set(),
  onToggleSection,
  className,
}) => {
  const [localExpandedSections, setLocalExpandedSections] = useState<Set<string>>(expandedSections);
  const settings = useSettings();
  const todos = useTodos();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (settings.autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length, settings.autoScroll]);

  // Handle section toggle
  const handleToggleSection = (sectionId: string) => {
    const newSet = new Set(localExpandedSections);
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    setLocalExpandedSections(newSet);
    onToggleSection?.(sectionId);
  };

  // Get icon for event type
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'planning':
        return <Brain className="w-4 h-4 text-blue-500" />;
      case 'tool_call':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'tool_output':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'code_execution':
        return <Terminal className="w-4 h-4 text-purple-500" />;
      case 'observation':
        return <Eye className="w-4 h-4 text-orange-500" />;
      case 'visualization':
        return <BarChart3 className="w-4 h-4 text-indigo-500" />;
      case 'todos_updated':
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case 'final_result':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Code className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get event title
  const getEventTitle = (event: StreamEvent) => {
    switch (event.event_type) {
      case 'planning':
        return 'Planning & Reasoning';
      case 'tool_call':
        return `Executing: ${(event as any).tool_name}`;
      case 'tool_output':
        return `Result: ${(event as any).tool_name}`;
      case 'code_execution':
        return `Code Execution (${(event as any).language})`;
      case 'observation':
        return 'Observation';
      case 'visualization':
        return `Visualization: ${(event as any).title || 'Chart'}`;
      case 'todos_updated':
        return 'Task Progress Updated';
      case 'final_result':
        return 'Analysis Complete';
      case 'error':
        return 'Error Occurred';
      default:
        return 'Event';
    }
  };

  // Render event content
  const renderEventContent = (event: StreamEvent, index: number) => {
    const eventId = `${event.event_type}-${index}`;
    const isExpanded = localExpandedSections.has(eventId);

    switch (event.event_type) {
      case 'planning':
        return (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {event.content}
          </div>
        );

      case 'tool_call':
        const toolCallEvent = event as any;
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {toolCallEvent.content}
            </div>
            {isExpanded && toolCallEvent.parameters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
              >
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Parameters:
                </h4>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(toolCallEvent.parameters, null, 2)}
                </pre>
              </motion.div>
            )}
          </div>
        );

      case 'tool_output':
        const toolOutputEvent = event as any;
        return (
          <div className="space-y-2">
            <div className={`text-sm ${
              toolOutputEvent.success 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              {toolOutputEvent.content}
            </div>
            {toolOutputEvent.execution_time && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Executed in {toolOutputEvent.execution_time}ms
              </div>
            )}
          </div>
        );

      case 'code_execution':
        const codeEvent = event as any;
        return (
          <div className="space-y-3">
            <CodeBlock
              code={codeEvent.code}
              language={codeEvent.language}
              title={`${codeEvent.language} code`}
              collapsible={true}
              copyable={true}
            />
            {codeEvent.output && (
              <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">Output:</h4>
                <pre className="text-sm text-green-400 overflow-x-auto">
                  {codeEvent.output}
                </pre>
              </div>
            )}
            {codeEvent.error && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Error:</h4>
                <pre className="text-sm text-red-600 dark:text-red-400 overflow-x-auto">
                  {codeEvent.error}
                </pre>
              </div>
            )}
          </div>
        );

      case 'observation':
        return (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {event.content}
          </div>
        );

      case 'visualization':
        const vizEvent = event as any;
        return (
          <VisualizationPanel
            visualizations={[{
              id: eventId,
              type: vizEvent.viz_type,
              title: vizEvent.title,
              description: vizEvent.description,
              data: vizEvent.data,
              config: vizEvent.config,
            }]}
          />
        );

      case 'final_result':
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {event.content}
            </div>
            {(event as any).metadata && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <div className="grid grid-cols-2 gap-2">
                  {(event as any).metadata.total_tokens && (
                    <div>Tokens: {(event as any).metadata.total_tokens}</div>
                  )}
                  {(event as any).metadata.execution_time && (
                    <div>Time: {(event as any).metadata.execution_time}ms</div>
                  )}
                  {(event as any).metadata.tools_used?.length > 0 && (
                    <div className="col-span-2">
                      Tools: {(event as any).metadata.tools_used.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'error':
        const errorEvent = event as any;
        return (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-sm text-red-700 dark:text-red-300">
              {errorEvent.error}
            </div>
            {errorEvent.recoverable && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                This error is recoverable. The system will retry automatically.
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {event.content || 'No content available'}
          </div>
        );
    }
  };

  // Group visualizations for panel
  const visualizations = events
    .filter(e => e.event_type === 'visualization')
    .map((event, index) => {
      const vizEvent = event as any;
      return {
        id: `viz-${index}`,
        type: vizEvent.viz_type,
        title: vizEvent.title,
        description: vizEvent.description,
        data: vizEvent.data,
        config: vizEvent.config,
      };
    });

  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Todo List (if todos exist) */}
      {todos.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <CheckSquare className="w-4 h-4 mr-2 text-emerald-500" />
            Task Progress
          </h3>
          <TodoList todos={todos} />
        </div>
      )}

      {/* Events Stream */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Code className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Execution details will appear here when you start a query
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.map((event, index) => {
              const eventId = `${event.event_type}-${index}`;
              const isExpanded = localExpandedSections.has(eventId);

              return (
                <motion.div
                  key={eventId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Event Header */}
                  <button
                    onClick={() => handleToggleSection(eventId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getEventIcon(event.event_type)}
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {getEventTitle(event)}
                        </h3>
                        {event.timestamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {/* Event Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-200 dark:border-gray-700 p-4"
                      >
                        {renderEventContent(event, index)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Streaming Indicator */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center p-4 text-sm text-gray-500 dark:text-gray-400"
          >
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing your request...
          </motion.div>
        )}
      </div>

      {/* Visualizations Panel (if any) */}
      {visualizations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
            Visualizations
          </h3>
          <VisualizationPanel visualizations={visualizations} />
        </div>
      )}
    </div>
  );
};

export default StreamingDisplay;