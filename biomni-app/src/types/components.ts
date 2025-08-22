// Component-specific types for Biomni Frontend

import { ReactNode } from 'react';
import type { StreamEvent, TodoItem } from './streaming';
import type { FileMetadata, SessionSummary } from './api';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Message Types
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: FileMetadata[];
  metadata?: {
    model?: string;
    tokens?: number;
    execution_time?: number;
  };
}

// Chat Interface Props
export interface ChatInterfaceProps extends BaseComponentProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (message: string, files?: File[]) => void;
  onStopStreaming?: () => void;
}

export interface MessageListProps extends BaseComponentProps {
  messages: Message[];
  isStreaming: boolean;
}

export interface MessageBubbleProps extends BaseComponentProps {
  message: Message;
  isLatest?: boolean;
}

export interface InputPanelProps extends BaseComponentProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  accept?: string;
}

// Streaming Display Props
export interface StreamingDisplayProps extends BaseComponentProps {
  events: StreamEvent[];
  isStreaming: boolean;
  expandedSections?: Set<string>;
  onToggleSection?: (sectionId: string) => void;
}

export interface StreamingEventRendererProps extends BaseComponentProps {
  event: StreamEvent;
  index: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

// Code Display Props
export interface CodeExecutionViewProps extends BaseComponentProps {
  event: StreamEvent & { event_type: 'code_execution' };
  isExpanded?: boolean;
  onToggle?: () => void;
}

export interface CodeBlockProps extends BaseComponentProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  title?: string;
  copyable?: boolean;
  collapsible?: boolean;
}

export interface OutputDisplayProps extends BaseComponentProps {
  output: string;
  error?: string;
  execution_time?: number;
  language?: string;
}

// Todo List Props
export interface TodoListProps extends BaseComponentProps {
  todos: TodoItem[];
  onUpdateTodo?: (todo: TodoItem) => void;
  onDeleteTodo?: (todoId: string) => void;
  sortable?: boolean;
}

export interface TodoItemProps extends BaseComponentProps {
  todo: TodoItem;
  onUpdate?: (todo: TodoItem) => void;
  onDelete?: (todoId: string) => void;
  draggable?: boolean;
}

// File Upload Props
export interface FileUploadZoneProps extends BaseComponentProps {
  onFilesUploaded: (files: FileMetadata[]) => void;
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export interface FileListProps extends BaseComponentProps {
  files: FileMetadata[];
  onFileRemove?: (fileId: string) => void;
  onFileDownload?: (file: FileMetadata) => void;
  showPreview?: boolean;
}

export interface FilePreviewProps extends BaseComponentProps {
  file: FileMetadata;
  onClose?: () => void;
  downloadable?: boolean;
}

export interface UploadProgressProps extends BaseComponentProps {
  uploads: Array<{
    fileId: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'complete' | 'error';
    error?: string;
  }>;
}

// Visualization Props
export interface VisualizationPanelProps extends BaseComponentProps {
  visualizations: VisualizationData[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export interface VisualizationData {
  id: string;
  type: 'plot' | 'table' | 'heatmap' | 'scatter' | 'bar' | 'line' | '3d';
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

export interface PlotlyChartProps extends BaseComponentProps {
  data: any;
  layout?: any;
  config?: any;
  title?: string;
  description?: string;
  downloadable?: boolean;
  onInteraction?: (event: any) => void;
}

export interface DataTableProps extends BaseComponentProps {
  data: any[];
  columns?: Array<{
    key: string;
    title: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: number;
  }>;
  searchable?: boolean;
  exportable?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

// Layout Props
export interface MainLayoutProps extends BaseComponentProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  rightPanel?: ReactNode;
  leftPanel?: ReactNode;
}

export interface HeaderProps extends BaseComponentProps {
  title?: string;
  logo?: ReactNode;
  actions?: ReactNode;
  user?: {
    name: string;
    avatar?: string;
  };
}

export interface SidebarProps extends BaseComponentProps {
  sessions: SessionSummary[];
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Settings and Configuration Props
export interface SettingsProps extends BaseComponentProps {
  settings: {
    theme: 'light' | 'dark' | 'system';
    model: string;
    temperature: number;
    maxTokens: number;
    autoSave: boolean;
    notifications: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export interface ThemeToggleProps extends BaseComponentProps {
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export interface ModelSelectorProps extends BaseComponentProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

// Error and Loading States
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export interface EmptyStateProps extends BaseComponentProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

// Modal and Dialog Props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
}

export interface ConfirmDialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

// Search and Filter Props
export interface SearchBarProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
  debounceDelay?: number;
  clearable?: boolean;
}

export interface FilterPanelProps extends BaseComponentProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  availableFilters: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'range';
    options?: Array<{ value: any; label: string }>;
  }>;
}

// Utility Types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type Theme = 'light' | 'dark' | 'system';

// Event Handlers
export type ClickHandler = (event: React.MouseEvent) => void;
export type SubmitHandler = (event: React.FormEvent) => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type KeyHandler = (event: React.KeyboardEvent) => void;