/**
 * Biomni API Client
 * Handles HTTP requests to FastAPI backend with error handling and retries
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import type { 
  ApiConfig,
  HealthStatus,
  FileUploadResponse,
  FileMetadata,
  ExecuteRequest,
  ExecuteResponse,
  SessionData,
  SessionSummary,
  ApiError 
} from '../../types/api';

export class BiomniAPIClient {
  private client: AxiosInstance;
  private config: Required<ApiConfig>;
  private sessionId: string | null = null;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:8000',
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set session ID for all requests
   */
  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthStatus> {
    const response = await this.client.get<HealthStatus>('/api/health');
    return response.data;
  }

  // File Management
  /**
   * Upload a file to S3 storage
   */
  async uploadFile(file: File, description?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (description) {
      formData.append('description', description);
    }

    const response = await this.client.post<FileUploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Get file metadata and download URL
   */
  async getFileInfo(fileId: string): Promise<FileMetadata> {
    const response = await this.client.get<FileMetadata>(`/api/files/${fileId}`);
    return response.data;
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.client.delete(`/api/files/${fileId}`);
  }

  // Query Execution
  /**
   * Execute a non-streaming query
   */
  async executeQuery(request: ExecuteRequest): Promise<ExecuteResponse> {
    const formData = new FormData();
    formData.append('prompt', request.prompt);
    
    if (request.model) {
      formData.append('model', request.model);
    }

    if (request.files && request.files.length > 0) {
      request.files.forEach((file, index) => {
        formData.append(`files`, file);
      });
    }

    const params: Record<string, string> = {};
    if (request.session_id || this.sessionId) {
      params.session_id = request.session_id || this.sessionId!;
    }

    const response = await this.client.post<ExecuteResponse>('/api/execute', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params,
    });

    return response.data;
  }

  // Session Management
  /**
   * Get session data and history
   */
  async getSession(sessionId: string): Promise<SessionData> {
    const response = await this.client.get<SessionData>(`/api/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * List all sessions for the user
   */
  async listSessions(): Promise<SessionSummary[]> {
    const response = await this.client.get<{ sessions: SessionSummary[] }>('/api/sessions');
    return response.data.sessions;
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<SessionData> {
    const response = await this.client.post<SessionData>('/api/sessions');
    return response.data;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`/api/sessions/${sessionId}`);
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.client.patch(`/api/sessions/${sessionId}`, { title });
  }

  // Streaming URL Generation
  /**
   * Generate streaming URL for EventSource
   */
  generateStreamUrl(params: {
    prompt: string;
    model?: string;
    session_id?: string;
    file_ids?: string[];
  }): string {
    const url = new URL('/api/stream', this.config.baseUrl);
    
    // Build full prompt with file references
    let fullPrompt = params.prompt;
    if (params.file_ids && params.file_ids.length > 0) {
      const fileRefs = params.file_ids.map(id => `@file:${id}`).join(' ');
      fullPrompt = `${params.prompt} ${fileRefs}`;
    }

    url.searchParams.append('prompt', fullPrompt);
    
    if (params.model) {
      url.searchParams.append('model', params.model);
    }

    if (params.session_id || this.sessionId) {
      url.searchParams.append('session_id', params.session_id || this.sessionId!);
    }

    return url.toString();
  }

  // Configuration
  /**
   * Update API configuration
   */
  updateConfig(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update axios instance
    this.client.defaults.baseURL = this.config.baseUrl;
    this.client.defaults.timeout = this.config.timeout;
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  // Private methods
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add session ID to params if available
        if (this.sessionId && config.params) {
          config.params.session_id = this.sessionId;
        }

        // Add request timestamp for debugging
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log request duration
        const duration = Date.now() - response.config.metadata?.startTime;
        console.debug(`API Request completed: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
        
        return response;
      },
      async (error: AxiosError) => {
        return this.handleResponseError(error);
      }
    );
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const { response, config } = error;

    // Log error details
    console.error('API Error:', {
      status: response?.status,
      statusText: response?.statusText,
      url: config?.url,
      method: config?.method,
    });

    // Handle specific error codes
    if (response) {
      switch (response.status) {
        case 400:
          const apiError = response.data as ApiError;
          throw new Error(apiError.detail || 'Bad request');
          
        case 401:
          // Handle authentication error
          this.sessionId = null;
          throw new Error('Authentication required');
          
        case 403:
          throw new Error('Access forbidden');
          
        case 404:
          throw new Error('Resource not found');
          
        case 413:
          throw new Error('File too large');
          
        case 429:
          // Rate limiting - implement retry with backoff
          const retryAfter = response.headers['retry-after'];
          if (retryAfter && config) {
            await this.wait(parseInt(retryAfter) * 1000);
            return this.retryRequest(config);
          }
          throw new Error('Rate limit exceeded');
          
        case 500:
          throw new Error('Server error. Please try again later.');
          
        case 502:
        case 503:
        case 504:
          // Server errors - implement retry
          if (config && this.shouldRetry(config)) {
            return this.retryRequest(config);
          }
          throw new Error('Service temporarily unavailable');
          
        default:
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout');
    }

    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error. Please check your connection.');
    }

    throw new Error(error.message || 'Unknown error occurred');
  }

  private shouldRetry(config: AxiosRequestConfig): boolean {
    const retryCount = (config as any).__retryCount || 0;
    return retryCount < this.config.retryAttempts;
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<any> {
    const retryCount = ((config as any).__retryCount || 0) + 1;
    (config as any).__retryCount = retryCount;

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
    await this.wait(delay);

    console.log(`Retrying request (attempt ${retryCount}/${this.config.retryAttempts})`);
    return this.client.request(config);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create default instance
export const apiClient = new BiomniAPIClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

export default apiClient;