// LangGraph-Compatible Streaming Event Types
// Based on LangGraph astream_events and FastAPI SSE patterns

// Base streaming event structure
export interface BaseStreamEvent {
  event_type: string;
  timestamp?: string;
  session_id?: string;
  step_id?: string;
}

// Core LangGraph streaming event types
export type StreamEventType = 
  | 'planning'
  | 'tool_call' 
  | 'tool_output'
  | 'code_execution'
  | 'observation'
  | 'visualization'
  | 'todos_updated'
  | 'final_result'
  | 'error'
  | 'complete'
  | 'heartbeat'
  | 'debug';

// Planning Event - Agent reasoning phase
export interface PlanningEvent extends BaseStreamEvent {
  event_type: 'planning';
  content: string;
  step_number?: number;
  reasoning_type?: 'initial' | 'reflection' | 'planning' | 'analysis';
}

// Tool Call Event - When LangGraph executes a tool
export interface ToolCallEvent extends BaseStreamEvent {
  event_type: 'tool_call';
  tool_name: string;
  content: string;
  parameters: Record<string, any>;
  execution_id?: string;
  tool_description?: string;
}

// Tool Output Event - Tool execution results
export interface ToolOutputEvent extends BaseStreamEvent {
  event_type: 'tool_output';
  tool_name: string;
  content: string;
  success: boolean;
  execution_time?: number;
  execution_id?: string;
  output_type?: 'text' | 'json' | 'table' | 'file' | 'error';
  metadata?: {
    tokens_used?: number;
    api_calls?: number;
    cache_hit?: boolean;
  };
}

// Code Execution Event - Python/R/Bash code execution
export interface CodeExecutionEvent extends BaseStreamEvent {
  event_type: 'code_execution';
  language: 'python' | 'r' | 'bash' | 'sql';
  code: string;
  output?: string;
  error?: string;
  execution_time?: number;
  cell_id?: string;
  status: 'running' | 'completed' | 'failed';
}

// Observation Event - Agent observations and insights
export interface ObservationEvent extends BaseStreamEvent {
  event_type: 'observation';
  content: string;
  observation_type: 'data_analysis' | 'pattern_recognition' | 'insight' | 'hypothesis';
  confidence?: number;
  data?: any;
}

// Visualization Event - Charts, plots, tables
export interface VisualizationEvent extends BaseStreamEvent {
  event_type: 'visualization';
  viz_type: 'plot' | 'heatmap' | 'scatter' | 'bar' | 'line' | 'table' | 'tree' | '3d';
  title?: string;
  description?: string;
  data: any;
  config?: {
    width?: number;
    height?: number;
    interactive?: boolean;
    downloadable?: boolean;
  };
}

// Todo Update Event - Task progress tracking
export interface TodosUpdatedEvent extends BaseStreamEvent {
  event_type: 'todos_updated';
  todos: TodoItem[];
  action?: 'added' | 'updated' | 'completed' | 'removed';
  updated_todo_id?: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
  priority?: 'low' | 'medium' | 'high';
  estimated_time?: number;
}

// Final Result Event - Complete response
export interface FinalResultEvent extends BaseStreamEvent {
  event_type: 'final_result';
  content: string;
  summary?: string;
  metadata?: {
    total_tokens?: number;
    execution_time?: number;
    tools_used?: string[];
    files_generated?: string[];
    visualizations_created?: number;
  };
}

// Error Event - Runtime errors
export interface ErrorEvent extends BaseStreamEvent {
  event_type: 'error';
  error: string;
  error_type?: 'tool_error' | 'model_error' | 'system_error' | 'user_error';
  recoverable?: boolean;
  retry_after?: number;
  context?: {
    tool_name?: string;
    step_id?: string;
    error_code?: string;
  };
}

// Complete Event - Stream termination
export interface CompleteEvent extends BaseStreamEvent {
  event_type: 'complete';
  summary?: string;
  total_duration?: number;
  final_status: 'success' | 'error' | 'cancelled';
}

// Heartbeat Event - Connection health
export interface HeartbeatEvent extends BaseStreamEvent {
  event_type: 'heartbeat';
  server_time: string;
  connection_id?: string;
}

// Debug Event - Development information
export interface DebugEvent extends BaseStreamEvent {
  event_type: 'debug';
  message: string;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  context?: Record<string, any>;
}

// Union type for all possible stream events
export type StreamEvent = 
  | PlanningEvent
  | ToolCallEvent
  | ToolOutputEvent
  | CodeExecutionEvent
  | ObservationEvent
  | VisualizationEvent
  | TodosUpdatedEvent
  | FinalResultEvent
  | ErrorEvent
  | CompleteEvent
  | HeartbeatEvent
  | DebugEvent;

// SSE Connection State
export interface SSEConnectionState {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  reconnectAttempts: number;
  lastEventTime?: string;
  error?: string;
}

// Event Source Configuration
export interface EventSourceConfig {
  url: string;
  params?: Record<string, string>;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

// Event Handler Types
export type EventHandler<T extends StreamEvent = StreamEvent> = (event: T) => void;
export type ErrorHandler = (error: Error) => void;
export type CompleteHandler = () => void;
export type ConnectionStateHandler = (state: SSEConnectionState) => void;

// Stream Query Configuration
export interface StreamQueryConfig {
  prompt: string;
  model?: string;
  session_id?: string;
  file_ids?: string[];
  stream_mode?: 'updates' | 'values' | 'debug';
  include_metadata?: boolean;
}

// LangGraph specific metadata (from astream_events)
export interface LangGraphMetadata {
  langgraph_step?: number;
  langgraph_node?: string;
  langgraph_triggers?: string[];
  langgraph_path?: string[];
  langgraph_checkpoint_ns?: string;
  run_id?: string;
}

// Enhanced event with LangGraph metadata
export interface LangGraphStreamEvent extends StreamEvent {
  metadata?: LangGraphMetadata;
}