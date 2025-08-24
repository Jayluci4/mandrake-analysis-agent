import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Play, Loader, CheckCircle, User, LogOut, X, ChevronDown, ChevronRight, Code, Brain, Eye, GripVertical, Image, FileJson, FileText as FileMarkdown, Copy, Check, Sun, Moon, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from './contexts/ThemeContext';
// import { useAuth } from './contexts/AuthContext';
// import { GoogleLoginButton } from './components/GoogleLoginButton';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: { name: string; id: string }[];
  images?: string[]; // For image URLs/data
  solution?: string; // Extracted solution content
}

interface StatusStep {
  icon: string;
  text: string;
  detail?: string;
  status: 'pending' | 'active' | 'completed';
}

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface ExecutionEvent {
  type: string;
  content?: string;
  timestamp: Date;
  expanded?: boolean;
  metadata?: any;
}

const AppBiomniUltra: React.FC = () => {
  // Theme hook
  const { isDark, toggleTheme } = useTheme();
  
  // Auth hook - temporarily disabled
  // const { user, isAuthenticated, logout } = useAuth();
  const isAuthenticated = false;
  const user = null;
  const logout = () => console.log('Logout');
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusSteps, setStatusSteps] = useState<StatusStep[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; id: string }[]>([]);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [accumulatedMessages, setAccumulatedMessages] = useState<string[]>([]); // Array to accumulate all messages
  const [rightPanelWidth, setRightPanelWidth] = useState(400); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'markdown' | 'json'>('markdown'); // Toggle for right panel
  const [copiedJson, setCopiedJson] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]); // Store generated images
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const rightPanelEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    rightPanelEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionEvents]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      // Limit between 300px and 800px
      setRightPanelWidth(Math.min(800, Math.max(300, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        id: `file-${Date.now()}-${Math.random()}`
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Extract solution from text - handles multi-line content
  const extractSolution = (text: string): { solution: string | null; beforeSolution: string; afterSolution: string } => {
    const solutionRegex = /<solution>([\s\S]*?)<\/solution>/i;
    const match = text.match(solutionRegex);
    
    if (match) {
      const solutionContent = match[1].trim();
      const beforeSolution = text.substring(0, match.index || 0).trim();
      const afterSolution = text.substring((match.index || 0) + match[0].length).trim();
      
      return {
        solution: solutionContent,
        beforeSolution,
        afterSolution
      };
    }
    
    return { solution: null, beforeSolution: text, afterSolution: '' };
  };

  // Copy JSON to clipboard
  const copyJsonToClipboard = () => {
    const jsonData = {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        solution: m.solution
      })),
      executionEvents,
      todos
    };
    
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: uploadedFiles
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setShowResults(false);
    setCurrentStreamingMessage('');
    setAccumulatedMessages([]); // Reset accumulated messages
    setGeneratedImages([]); // Reset images
    setExecutionEvents([]);
    setTodos([]);
    
    // Initialize status steps
    setStatusSteps([
      { icon: '🚀', text: 'New task launched', status: 'active' },
      { icon: '🔍', text: 'Retrieving resources...', status: 'pending' },
      { icon: '🤖', text: 'Starting the agent...', status: 'pending' },
      { icon: '🧠', text: 'Reasoning...', status: 'pending' },
      { icon: '📋', text: 'Planning...', status: 'pending' },
      { icon: '⚡', text: 'Executing...', status: 'pending' },
      { icon: '📊', text: 'Observing...', status: 'pending' },
      { icon: '✅', text: 'Complete', status: 'pending' }
    ]);

    try {
      // Connect to SSE endpoint
      const url = `http://localhost:8003/api/chat/intelligent?message=${encodeURIComponent(userMessage.content)}`;
      console.log('Connecting to SSE endpoint:', url);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      
      let hasReceivedEvent = false;
      let connectionTimeout: NodeJS.Timeout;
      let toolCallCount = 0;
      
      // Set a timeout for initial connection
      connectionTimeout = setTimeout(() => {
        if (!hasReceivedEvent) {
          console.warn('No events received after 10 seconds');
          setCurrentStreamingMessage('Processing your request... This may take a moment as the agent initializes.');
        }
      }, 10000);
      
      // Add connection opened handler
      eventSource.onopen = () => {
        console.log('SSE connection opened successfully');
        setCurrentStreamingMessage('Connected. Processing your request...');
      };
      
      // Helper to mark that we've received data
      const markEventReceived = () => {
        if (!hasReceivedEvent) {
          hasReceivedEvent = true;
          clearTimeout(connectionTimeout);
          setCurrentStreamingMessage('');
        }
      };
      
      // IMPORTANT: Handle generic messages (without event type)
      eventSource.onmessage = function(event) {
        try {
          markEventReceived();
          console.log('Received message:', event.data);
          const data = JSON.parse(event.data);
          
          // Route based on type field in the data
          switch(data.type) {
            case 'planning':
              handlePlanningEvent(data);
              break;
            case 'reasoning':
              handleReasoningEvent(data);
              break;
            case 'tool_call':
              handleToolCallEvent(data);
              break;
            case 'observation':
            case 'tool_output':
              handleObservationEvent(data);
              break;
            case 'ai_message':
              handleAiMessageEvent(data);
              break;
            case 'final_answer':
              handleFinalAnswerEvent(data);
              break;
            case 'visualization':
            case 'image':
              handleVisualizationEvent(data);
              break;
            case 'done':
              handleDoneEvent();
              break;
            case 'error':
              handleErrorEvent(data);
              break;
            default:
              console.log('Unknown event type:', data.type);
          }
        } catch (e) {
          console.error('Failed to parse message:', e, event.data);
        }
      };
      
      // Handler functions
      const handleFinalAnswerEvent = (data: any) => {
        let finalContent = data.content || '';
        console.log('Received final_answer event, length:', finalContent.length);
        
        // Remove any prompt instructions that might have leaked through (like AppBiomniPowerful does)
        finalContent = finalContent.replace(/CRITICAL[^\n]*provide[^\n]*protocol[^\n]*/gi, '');
        finalContent = finalContent.replace(/End your response with[^\n]*/gi, '');
        
        // Check if content already has solution tags
        const solutionMatch = finalContent.match(/<solution>([\s\S]*?)<\/solution>/);
        if (solutionMatch) {
          // Extract just the solution content
          finalContent = solutionMatch[1].trim();
        }
        
        // The orchestrator sends solution content as final_answer
        // Store it with solution tags for consistent extraction
        if (finalContent && finalContent.length > 10) {
          setAccumulatedMessages(prev => [...prev, `<solution>${finalContent}</solution>`]);
          
          // Show solution indicator
          setCurrentStreamingMessage('📋 Solution/Protocol Found!');
          updateStatusStep(6, 'completed');
          
          // IMMEDIATELY add the solution to the left panel (like AppBiomniPowerful does)
          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + finalContent,
            timestamp: new Date(),
            solution: finalContent
          }]);
          
          // Also add to execution events for right panel
          setExecutionEvents(prev => [...prev, {
            type: 'final_protocol',
            content: finalContent,
            timestamp: new Date()
          }]);
          
          // Mark todos as complete
          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })));
        }
      };
      
      const handleAiMessageEvent = (data: any) => {
        const content = data.content || '';
        console.log('Received ai_message event, length:', content.length);
        
        // Check if this AI message contains a solution (like AppBiomniPowerful does)
        const solutionMatch = content.match(/<solution>([\s\S]*?)<\/solution>/);
        if (solutionMatch) {
          console.log('✅ Found complete solution in ai_message!');
          const protocol = solutionMatch[1].trim();
          
          // Store the solution immediately
          setAccumulatedMessages(prev => [...prev, `<solution>${protocol}</solution>`]);
          
          // Show solution indicator
          setCurrentStreamingMessage('');
          updateStatusStep(6, 'completed');
          
          // IMMEDIATELY add the solution to the left panel (like AppBiomniPowerful line 427-433)
          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + protocol,
            timestamp: new Date(),
            solution: protocol
          }]);
          
          // Also add to execution events for right panel
          setExecutionEvents(prev => [...prev, {
            type: 'final_protocol',
            content: protocol,
            timestamp: new Date()
          }]);
          
          // Mark all todos as completed when solution is found
          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })));
        } else {
          // Regular AI message without solution
          setAccumulatedMessages(prev => {
            const updated = [...prev, content];
            console.log('Total accumulated messages:', updated.length);
            return updated;
          });
          
          // Show non-solution content as streaming
          setCurrentStreamingMessage(content);
        }
        
        updateStatusStep(2, 'active');
        if (content.includes('Updated plan:') || content.includes('Checklist')) {
          updateStatusStep(4, 'active');
        }
      };
      
      const handlePlanningEvent = (data: any) => {
        console.log('Received planning event');
        updateStatusStep(4, 'active');
        
        if (data.steps && Array.isArray(data.steps)) {
          const newTodos = data.steps.map((step: any, index: number) => ({
            id: index + 1,
            text: typeof step === 'string' ? step : step.step || step.description || '',
            completed: step.status === 'completed'
          }));
          setTodos(newTodos);
          
          setExecutionEvents(prev => [...prev, {
            type: 'planning',
            content: 'Planning the next steps',
            timestamp: new Date(),
            metadata: { steps: data.steps }
          }]);
        }
      };
      
      const handleReasoningEvent = (data: any) => {
        console.log('Received reasoning event');
        updateStatusStep(3, 'active');
        
        setExecutionEvents(prev => [...prev, {
          type: 'reasoning',
          content: data.content || data.reasoning || 'Reasoning about the task...',
          timestamp: new Date()
        }]);
      };
      
      const handleToolCallEvent = (data: any) => {
        console.log('Received tool_call event');
        toolCallCount++;
        updateStatusStep(5, 'active');
        
        setExecutionEvents(prev => [...prev, {
          type: 'tool_call',
          content: data.code || data.tool_name || 'Executing tool...',
          timestamp: new Date(),
          metadata: {
            tool_name: data.tool_name,
            tool_id: data.tool_id,
            language: data.language || 'python'
          }
        }]);
        
        if (toolCallCount <= todos.length) {
          setTodos(prev => prev.map((todo, idx) => 
            idx < toolCallCount ? { ...todo, completed: true } : todo
          ));
        }
      };
      
      const handleObservationEvent = (data: any) => {
        console.log('Received observation event');
        updateStatusStep(6, 'active');
        
        setExecutionEvents(prev => [...prev, {
          type: 'observation',
          content: data.content || data.output || 'Observation from execution',
          timestamp: new Date()
        }]);
      };
      
      const handleVisualizationEvent = (data: any) => {
        console.log('Received visualization event:', data);
        
        // Handle image data
        if (data.image || data.image_url || data.image_data) {
          const imageUrl = data.image_url || data.image || data.image_data;
          setGeneratedImages(prev => [...prev, imageUrl]);
          
          setExecutionEvents(prev => [...prev, {
            type: 'visualization',
            content: data.caption || 'Generated visualization',
            timestamp: new Date(),
            metadata: { imageUrl, caption: data.caption }
          }]);
        }
      };
      
      const handleDoneEvent = () => {
        console.log('Received done event');
        
        eventSource.close();
        eventSourceRef.current = null;
        setIsProcessing(false);
        updateStatusStep(7, 'completed');
        
        // Process all accumulated messages
        // Use single newline to preserve solution tags
        const fullContent = accumulatedMessages.join('\n');
        console.log('Full accumulated content length:', fullContent.length);
        console.log('Number of accumulated messages:', accumulatedMessages.length);
        
        // Debug: Check if solution tags are present
        const hasSolutionTags = fullContent.includes('<solution>') && fullContent.includes('</solution>');
        if (hasSolutionTags) {
          console.log('✅ Solution tags found in accumulated content');
          const solutionStart = fullContent.indexOf('<solution>');
          const solutionEnd = fullContent.indexOf('</solution>');
          console.log('Solution tag positions:', { start: solutionStart, end: solutionEnd });
        } else {
          console.log('⚠️ No complete solution tags found');
          // Check if we have partial tags
          if (fullContent.includes('<solution>')) {
            console.log('Found opening <solution> tag but no closing tag');
          }
          if (fullContent.includes('</solution>')) {
            console.log('Found closing </solution> tag but no opening tag');
          }
          // Log a sample to help debug
          console.log('Sample of accumulated content:', fullContent.substring(0, 200));
        }
        
        // Extract solution and other content
        const { solution } = extractSolution(fullContent);
        
        // Create the final message
        let finalMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: fullContent || currentStreamingMessage,
          timestamp: new Date(),
          images: generatedImages.length > 0 ? generatedImages : undefined,
          solution: solution || undefined
        };
        
        // Check if we already added the solution via ai_message or final_answer handlers
        const alreadyHasSolution = messages.some(msg => msg.solution);
        
        if (solution && !alreadyHasSolution) {
          console.log('✅ Solution found in accumulated messages, adding to left panel');
          console.log('Solution length:', solution.length);
          
          // Build the formatted content - show ONLY the solution as the main content
          finalMessage.content = '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + solution;
          finalMessage.solution = solution;
          
          // Add the solution message to the left panel
          setMessages(prev => [...prev, finalMessage]);
          
          // Mark all todos as completed
          setTodos(prev => prev.map(todo => ({ ...todo, completed: true })));
        } else if (!solution && !alreadyHasSolution) {
          console.log('⚠️ No solution found in the response');
          // If no solution but we have content, show other accumulated messages
          if (fullContent.trim()) {
            // Filter out empty messages and solution tags
            const cleanContent = accumulatedMessages
              .filter(msg => msg && msg.trim().length > 0)
              .filter(msg => !msg.includes('<solution>'))
              .join('\n\n');
            
            if (cleanContent.trim() && cleanContent.length > 50) {
              finalMessage.content = cleanContent;
              setMessages(prev => [...prev, finalMessage]);
            }
          }
        } else if (alreadyHasSolution) {
          console.log('✅ Solution already added to left panel');
        }
        setCurrentStreamingMessage('');
        setTodos(prev => prev.map(todo => ({ ...todo, completed: true })));
      };
      
      const handleErrorEvent = (data: any) => {
        console.error('Received error event:', data);
        setExecutionEvents(prev => [...prev, {
          type: 'error',
          content: data.content || data.error || 'An error occurred',
          timestamp: new Date()
        }]);
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
        eventSourceRef.current = null;
        setIsProcessing(false);
        
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Connection error. Please ensure the backend server is running on port 8003.`,
          timestamp: new Date()
        }]);
      };

    } catch (err) {
      console.error('Failed to connect:', err);
      setIsProcessing(false);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Failed to establish connection: ${err}`,
        timestamp: new Date()
      }]);
    }
  };

  // Update status step
  const updateStatusStep = (index: number, status: 'active' | 'completed') => {
    setStatusSteps(prev => {
      const newSteps = [...prev];
      for (let i = 0; i <= index; i++) {
        if (i < index) {
          newSteps[i].status = 'completed';
        } else {
          newSteps[i].status = status;
        }
      }
      return newSteps;
    });
  };

  // Stop processing
  const stopProcessing = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsProcessing(false);
    
    const fullContent = accumulatedMessages.join('\n\n');
    const { solution, beforeSolution } = extractSolution(fullContent);
    
    let finalContent = '';
    if (solution) {
      finalContent = beforeSolution + '\n\n### 📋 Solution:\n\n' + solution;
    } else if (fullContent) {
      finalContent = fullContent;
    } else if (currentStreamingMessage) {
      finalContent = currentStreamingMessage + '\n\n*[Stopped by user]*';
    }
    
    if (finalContent) {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: finalContent,
        timestamp: new Date(),
        images: generatedImages.length > 0 ? generatedImages : undefined
      };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentStreamingMessage('');
    }
  };

  // Toggle event expansion
  const toggleEventExpansion = (index: number) => {
    setExecutionEvents(prev => prev.map((event, i) => 
      i === index ? { ...event, expanded: !event.expanded } : event
    ));
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                MandrakeBio Analysis Agent 
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  Active
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                General biomedical AI tasks, protocol execution & multi-tool orchestration
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Research Agent Button */}
            <button 
              onClick={() => {
                // Open BioAgent Research app (runs on port 9001)
                window.location.href = 'http://localhost:9001'
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-md transition-all duration-200 shadow-md hover:shadow-blue-500/25 text-sm"
              title="Switch to Research Agent for literature search"
            >
              <Search className="w-4 h-4" />
              <span>Research Agent</span>
            </button>

            {/* Google Login / User Info - temporarily disabled */}
            {/* {!isAuthenticated ? (
              <GoogleLoginButton />
            ) : ( */}
            {isAuthenticated && (
              <div className="flex items-center space-x-3">
                {/* User Info */}
                <div className="flex items-center space-x-2">
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-yellow-500" />
              ) : (
                <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            {/* Logout Button (only when authenticated) */}
            {isAuthenticated && (
              <button 
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6">
          <div className="flex space-x-8">
            <button className="py-3 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm flex items-center space-x-2">
              <span>🤖</span>
              <span>Biomni Co-pilot</span>
            </button>
            <button className="py-3 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium text-sm flex items-center space-x-2">
              <span>⚡</span>
              <span>Biomni Executor</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content with dynamic width */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: rightPanelWidth + 'px' }}>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Messages with Markdown rendering */}
            {messages.map(message => (
              <div key={message.id} className={message.role === 'user' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'}>
                <div className="flex items-start space-x-3">
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    {/* Render content as Markdown */}
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !className || !match;
                            return !isInline && match ? (
                              <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto">
                                <code className={`language-${match[1]}`} {...props}>
                                  {String(children).replace(/\n$/, '')}
                                </code>
                              </pre>
                            ) : (
                              <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          h3: ({children}) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h3>,
                          ul: ({children}) => <ul className="list-disc pl-5 space-y-1 text-gray-900 dark:text-white">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-5 space-y-1 text-gray-900 dark:text-white">{children}</ol>,
                          p: ({children}) => <p className="text-gray-900 dark:text-white">{children}</p>,
                          strong: ({children}) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Display images if present */}
                    {message.images && message.images.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Generated Visualizations:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {message.images.map((img, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden">
                              <img 
                                src={img} 
                                alt={`Visualization ${idx + 1}`}
                                className="w-full h-auto"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBQbGFjZWhvbGRlcjwvdGV4dD48L3N2Zz4=';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display files if present */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span>Uploaded files: {message.files.map(f => f.name).join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Current streaming message */}
            {isProcessing && currentStreamingMessage && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <div className="flex-1 prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentStreamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && !currentStreamingMessage && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm animate-pulse">B</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-white">
                      Launching workflow executor (this may take a while)... 🧠
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Upload files"
              >
                <Upload className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Ask a biomedical question..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isProcessing}
                  rows={Math.min(5, Math.max(1, input.split('\n').length))}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              </div>
              {isProcessing ? (
                <button
                  onClick={stopProcessing}
                  className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  title="Stop processing"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50 transition-colors"
                  disabled={!input.trim()}
                  title="Send message"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Files ready: {uploadedFiles.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors absolute h-full flex items-center justify-center"
          style={{ right: rightPanelWidth + 'px' }}
          onMouseDown={() => setIsResizing(true)}
        >
          <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Right Panel with dual rendering */}
        <div 
          className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto absolute right-0 h-full flex flex-col"
          style={{ width: rightPanelWidth + 'px' }}
        >
          {/* Right Panel Header with toggle */}
          <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Execution Details</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('markdown')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'markdown' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title="Markdown view"
              >
                <FileMarkdown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'json' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title="JSON view"
              >
                <FileJson className="w-4 h-4" />
              </button>
              {viewMode === 'json' && (
                <button
                  onClick={copyJsonToClipboard}
                  className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Copy JSON"
                >
                  {copiedJson ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {viewMode === 'markdown' ? (
              // Markdown View
              <div className="space-y-4">
                {/* Status Steps */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Status</h4>
                  {statusSteps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'active' ? 'bg-blue-500' :
                        'bg-gray-200 dark:bg-gray-600'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3 text-white" />
                        ) : step.status === 'active' ? (
                          <Loader className="w-3 h-3 text-white animate-spin" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm ${
                          step.status !== 'pending' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.icon} {step.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Todo List */}
                {todos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Tasks</h4>
                    <div className="space-y-2">
                      {todos.map((todo) => (
                        <div key={todo.id} className="flex items-start space-x-2">
                          <span className="text-sm text-gray-600">{todo.id}.</span>
                          <div className="flex items-start space-x-2 flex-1">
                            {todo.completed && <span className="text-green-600 text-sm">✓</span>}
                            <span className={`text-sm ${
                              todo.completed ? 'text-green-600 dark:text-green-400 line-through' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {todo.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Events */}
                {executionEvents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Execution Log</h4>
                    {executionEvents.map((event, index) => (
                      <div key={index} className={`rounded-md p-3 ${
                        event.type === 'reasoning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                        event.type === 'planning' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        event.type === 'tool_call' ? 'bg-gray-50 dark:bg-gray-700' :
                        event.type === 'observation' ? 'bg-green-50 dark:bg-green-900/20' :
                        event.type === 'visualization' ? 'bg-purple-50 dark:bg-purple-900/20' :
                        'bg-gray-50 dark:bg-gray-700'
                      }`}>
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleEventExpansion(index)}
                        >
                          <div className="flex items-center space-x-2">
                            {event.type === 'reasoning' && <Brain className="w-4 h-4 text-yellow-600" />}
                            {event.type === 'planning' && <span>📋</span>}
                            {event.type === 'tool_call' && <Code className="w-4 h-4 text-gray-600" />}
                            {event.type === 'observation' && <Eye className="w-4 h-4 text-green-600" />}
                            {event.type === 'visualization' && <Image className="w-4 h-4 text-purple-600" />}
                            <span className="font-medium text-sm capitalize">{event.type.replace('_', ' ')}</span>
                          </div>
                          {event.content && event.content.length > 50 && (
                            event.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                        
                        {event.content && (
                          <div className={`mt-2 text-xs text-gray-700 dark:text-gray-300 ${
                            !event.expanded && event.content.length > 100 ? 'line-clamp-2' : ''
                          }`}>
                            <pre className="whitespace-pre-wrap font-mono">{event.content}</pre>
                          </div>
                        )}
                        
                        {event.type === 'visualization' && event.metadata?.imageUrl && event.expanded && (
                          <div className="mt-2">
                            <img 
                              src={event.metadata.imageUrl} 
                              alt={event.metadata.caption || 'Visualization'}
                              className="w-full rounded border"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // JSON View
              <div className="bg-gray-900 dark:bg-gray-950 text-gray-100 dark:text-gray-200 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify({
                    statusSteps,
                    todos,
                    executionEvents: executionEvents.map(e => ({
                      type: e.type,
                      content: e.content?.substring(0, 100) + (e.content && e.content.length > 100 ? '...' : ''),
                      timestamp: e.timestamp,
                      metadata: e.metadata
                    })),
                    messages: messages.map(m => ({
                      role: m.role,
                      contentLength: m.content.length,
                      hasSolution: !!m.solution,
                      hasImages: !!(m.images && m.images.length > 0),
                      timestamp: m.timestamp
                    }))
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div ref={rightPanelEndRef} />
        </div>
      </div>
    </div>
  );
};

export default AppBiomniUltra;