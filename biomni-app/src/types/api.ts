// Core API Types for Biomni Frontend
// Compatible with LangGraph streaming events and FastAPI backend

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
}

// Health Status
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  redis?: 'connected' | 'error';
  s3?: 'connected' | 'error';
  services?: Record<string, string>;
}

// File Management
export interface FileMetadata {
  id: string;
  original_name: string;
  s3_key: string;
  s3_url: string;
  size: number;
  type: string;
  uploaded_at: string;
  download_url?: string;
  description?: string;
}

export interface FileUploadResponse {
  file_id: string;
  reference: string;
  metadata: FileMetadata;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Session Management
export interface SessionData {
  id: string;
  created_at: string;
  user_id: string;
  history: SessionHistoryItem[];
}

export interface SessionHistoryItem {
  timestamp: string;
  prompt: string;
  model: string;
  files: string[];
  response?: string;
}

export interface SessionSummary {
  id: string;
  created_at: string;
  last_activity: string;
  query_count: number;
  title?: string;
}

// Query Execution
export interface ExecuteRequest {
  prompt: string;
  model?: string;
  session_id?: string;
  files?: File[];
}

export interface ExecuteResponse {
  result: string;
  log?: string;
  model: string;
  session_id: string;
  files?: string[];
  metadata?: {
    total_tokens?: number;
    execution_time?: number;
    tools_used?: string[];
  };
}

// Error Handling
export interface ApiError {
  detail: string;
  error_code?: string;
  recoverable?: boolean;
  retry_after?: number;
}

// File Types
export const ALLOWED_FILE_EXTENSIONS = [
  // Text/Data formats
  '.csv', '.txt', '.json', '.pdf', '.xlsx', '.xls', '.tsv', '.parquet',
  // Biomedical formats
  '.fasta', '.fastq', '.vcf', '.bed', '.gff', '.gtf',
  '.bam', '.sam', '.bigwig', '.bigbed',
  // Images
  '.png', '.jpg', '.jpeg',
  // Scientific data
  '.h5', '.hdf5'
] as const;

export type AllowedFileExtension = typeof ALLOWED_FILE_EXTENSIONS[number];

// Model Configuration
export interface ModelConfig {
  name: string;
  display_name: string;
  max_tokens: number;
  supports_files: boolean;
  supports_streaming: boolean;
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'azure-gpt-4.1': {
    name: 'azure-gpt-4.1',
    display_name: 'GPT-4.1 (Azure)',
    max_tokens: 32768,
    supports_files: true,
    supports_streaming: true,
  },
  'azure-o4-mini': {
    name: 'azure-o4-mini',
    display_name: 'o4-mini (Azure)',
    max_tokens: 16384,
    supports_files: true,
    supports_streaming: true,
  },
  'claude-3-5-sonnet-20241022': {
    name: 'claude-3-5-sonnet-20241022',
    display_name: 'Claude 3.5 Sonnet',
    max_tokens: 8192,
    supports_files: true,
    supports_streaming: true,
  },
  'gemini-2.5-pro': {
    name: 'gemini-2.5-pro',
    display_name: 'Gemini 2.5 Pro',
    max_tokens: 65536,
    supports_files: true,
    supports_streaming: true,
  },
} as const;

export type ModelName = keyof typeof AVAILABLE_MODELS;