/**
 * LangGraph-Compatible EventSource Manager
 * Handles SSE streaming from FastAPI backend with LangGraph integration
 */

import type { 
  StreamEvent, 
  SSEConnectionState, 
  EventSourceConfig,
  EventHandler,
  ErrorHandler,
  CompleteHandler,
  ConnectionStateHandler 
} from '../../types/streaming';

export class EventSourceManager {
  private eventSource: EventSource | null = null;
  private config: Required<EventSourceConfig>;
  private connectionState: SSEConnectionState;
  private messageQueue: StreamEvent[] = [];
  private isProcessingQueue = false;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private lastEventTime?: Date;

  // Event handlers
  private eventHandlers = new Map<string, EventHandler[]>();
  private errorHandler?: ErrorHandler;
  private completeHandler?: CompleteHandler;
  private stateHandler?: ConnectionStateHandler;

  constructor(config: EventSourceConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      timeout: 120000,
      ...config
    };

    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0
    };
  }

  /**
   * Connect to the SSE stream
   */
  connect(): void {
    try {
      this.updateConnectionState({ status: 'connecting', reconnectAttempts: 0 });
      
      const url = this.buildStreamUrl();
      console.log('Connecting to SSE stream:', url);

      this.eventSource = new EventSource(url, {
        withCredentials: false // Adjust based on CORS requirements
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from the SSE stream
   */
  disconnect(): void {
    this.cleanup();
    this.updateConnectionState({ status: 'disconnected', reconnectAttempts: 0 });
  }

  /**
   * Add event handler for specific event types
   */
  on<T extends StreamEvent>(eventType: T['event_type'], handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler as EventHandler);
  }

  /**
   * Remove event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Set error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Set completion handler
   */
  onComplete(handler: CompleteHandler): void {
    this.completeHandler = handler;
  }

  /**
   * Set connection state handler
   */
  onStateChange(handler: ConnectionStateHandler): void {
    this.stateHandler = handler;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): SSEConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get ready state from EventSource
   */
  getReadyState(): number | null {
    return this.eventSource?.readyState ?? null;
  }

  private buildStreamUrl(): string {
    const url = new URL(this.config.url);
    
    // Add query parameters
    if (this.config.params) {
      Object.entries(this.config.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    // Connection opened
    this.eventSource.onopen = () => {
      console.log('SSE connection established');
      this.updateConnectionState({ 
        status: 'connected', 
        reconnectAttempts: 0,
        lastEventTime: new Date().toISOString()
      });
      this.lastEventTime = new Date();
    };

    // Standard message handler
    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    // Error handler
    this.eventSource.onerror = (error: Event) => {
      this.handleConnectionError(new Error('EventSource connection error'));
    };

    // Set up custom event listeners for specific LangGraph events
    this.setupCustomEventListeners();
  }

  private setupCustomEventListeners(): void {
    if (!this.eventSource) return;

    // LangGraph specific events
    const eventTypes = [
      'planning', 'tool_call', 'tool_output', 'code_execution',
      'observation', 'visualization', 'todos_updated', 'final_result',
      'error', 'complete', 'heartbeat', 'debug'
    ];

    eventTypes.forEach(eventType => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        this.handleTypedEvent(eventType, event);
      });
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      this.lastEventTime = new Date();
      
      // Parse the event data
      const eventData = this.parseEventData(event.data);
      
      if (eventData) {
        this.processStreamEvent(eventData);
      }
    } catch (error) {
      console.error('Failed to handle SSE message:', error);
      this.errorHandler?.(new Error(`Parse error: ${error}`));
    }
  }

  private handleTypedEvent(eventType: string, event: MessageEvent): void {
    try {
      const eventData = this.parseEventData(event.data);
      
      if (eventData) {
        // Ensure event_type matches the SSE event name
        eventData.event_type = eventType as any;
        this.processStreamEvent(eventData);
      }
    } catch (error) {
      console.error(`Failed to handle ${eventType} event:`, error);
    }
  }

  private parseEventData(data: string): StreamEvent | null {
    try {
      // Handle different data formats
      if (data.startsWith('{')) {
        // JSON format
        return JSON.parse(data) as StreamEvent;
      } else if (data.startsWith('data:')) {
        // SSE format with data: prefix
        const jsonData = data.replace(/^data:\s*/, '');
        return JSON.parse(jsonData) as StreamEvent;
      } else {
        // Plain text - create a generic event
        return {
          event_type: 'debug',
          message: data,
          level: 'info'
        } as any;
      }
    } catch (error) {
      console.error('Failed to parse event data:', error);
      return null;
    }
  }

  private processStreamEvent(event: StreamEvent): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Handle special events
    if (event.event_type === 'complete') {
      this.handleStreamComplete();
      return;
    }

    if (event.event_type === 'error') {
      this.handleStreamError(event as any);
      return;
    }

    if (event.event_type === 'heartbeat') {
      this.handleHeartbeat(event as any);
      return;
    }

    // Queue or immediately dispatch the event
    this.messageQueue.push(event);
    this.processMessageQueue();
  }

  private processMessageQueue(): void {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Process all queued messages
    while (this.messageQueue.length > 0) {
      const event = this.messageQueue.shift()!;
      this.dispatchEvent(event);
    }

    this.isProcessingQueue = false;
  }

  private dispatchEvent(event: StreamEvent): void {
    // Dispatch to specific event type handlers
    const handlers = this.eventHandlers.get(event.event_type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.event_type}:`, error);
        }
      });
    }

    // Also dispatch to generic 'event' handlers
    const genericHandlers = this.eventHandlers.get('event');
    if (genericHandlers) {
      genericHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in generic event handler:', error);
        }
      });
    }
  }

  private handleStreamComplete(): void {
    console.log('Stream completed');
    this.completeHandler?.();
    this.disconnect();
  }

  private handleStreamError(event: StreamEvent & { event_type: 'error' }): void {
    const error = new Error(event.error);
    
    // Check if recoverable
    if (event.recoverable && event.retry_after) {
      console.log(`Recoverable error, retrying in ${event.retry_after}s`);
      setTimeout(() => {
        this.reconnect();
      }, event.retry_after * 1000);
    } else {
      this.errorHandler?.(error);
    }
  }

  private handleHeartbeat(event: StreamEvent & { event_type: 'heartbeat' }): void {
    this.lastEventTime = new Date();
    this.updateConnectionState({ 
      status: 'connected',
      lastEventTime: event.timestamp
    });
  }

  private handleConnectionError(error: Error): void {
    console.error('SSE connection error:', error);
    
    this.updateConnectionState({ 
      status: 'error',
      error: error.message 
    });

    if (this.connectionState.reconnectAttempts < this.config.reconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.errorHandler?.(new Error('Max reconnection attempts reached'));
    }
  }

  private scheduleReconnect(): void {
    const delay = this.calculateReconnectDelay();
    
    this.updateConnectionState({ 
      status: 'reconnecting',
      reconnectAttempts: this.connectionState.reconnectAttempts + 1
    });

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private reconnect(): void {
    this.cleanup();
    this.connect();
  }

  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.connectionState.reconnectAttempts);
    const maxDelay = 30000; // 30 seconds max
    const jitter = Math.random() * 0.3; // 30% jitter
    
    return Math.min(exponentialDelay * (1 + jitter), maxDelay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkConnection();
    }, this.config.heartbeatInterval);
  }

  private checkConnection(): void {
    if (!this.lastEventTime) return;

    const timeSinceLastEvent = Date.now() - this.lastEventTime.getTime();
    
    if (timeSinceLastEvent > this.config.timeout) {
      console.warn('Connection timeout - no events received');
      this.handleConnectionError(new Error('Connection timeout'));
    }
  }

  private updateConnectionState(updates: Partial<SSEConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.stateHandler?.(this.connectionState);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Process any remaining queued messages
    this.processMessageQueue();
  }
}