// AIDEV-NOTE: Type definitions matching the backend API from frontendguide.md

export interface SearchRequest {
  query: string
  toggles: {
    search: boolean
  }
}

export interface Paper {
  title: string
  abstract: string
  authors: string[]
  citations: number
  publication_date?: string
  hyperlink: string
  source: string
  doi?: string
  journal?: string
}

export interface ToolCall {
  tool: string
  query: string
  papers_found: number
  duration: number
  error?: string
}

export interface ReasoningStep {
  step: string
  thought: string
  action?: string
}

export interface SearchResult {
  query: string
  papers: Paper[]
  analysis: string
  raw_data: any
  tool_calls?: ToolCall[]
  reasoning_trace?: ReasoningStep[]
}

export interface TaskStatus {
  task_id: string
  status: 'in_progress' | 'completed' | 'failed'
  query: string
  result?: SearchResult
  error?: string
}

export interface ProgressUpdate {
  progress: number
  current_step: string
  message: string
}

export interface PapersStreamData {
  papers: Paper[]
  phase: 'initial' | 'additional'
  count: number
  message: string
}

export interface SummaryStreamData {
  chunk: string
  message: string
}

export interface WebSocketMessage {
  type: 'connected' | 'progress' | 'result' | 'error' | 'papers' | 'summary_stream'
  data?: ProgressUpdate | SearchResult | { error: string } | PapersStreamData | SummaryStreamData
  timestamp: string
  task_id?: string
}