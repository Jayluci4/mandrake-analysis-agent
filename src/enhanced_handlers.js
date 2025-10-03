/**
 * Enhanced Event Handlers for Biomni Integration
 * Handles rich metadata from Biomni's JSON object streaming
 */

// Enhanced tool call handler for Biomni's execute_blocks
export const handleEnhancedToolCallEvent = (data, setExecutionEvents, setGeneratedImages, todos, setTodos) => {
  console.log('Enhanced tool_call event:', data)
  
  // Extract rich metadata from Biomni
  const code = data.code || data.content || ''
  const metadata = data.metadata || {}
  
  // Handle visualization code with enhanced detection
  if (code.includes('plt.') || code.includes('matplotlib') || code.includes('seaborn') || code.includes('plotly')) {
    console.log('Detected visualization code, generating mock plots...')
    const mockImages = generateMultiplePlots(code.includes('subplot') ? 4 : 2)
    setGeneratedImages(prev => [...prev, ...mockImages])
    
    // Add enhanced visualization event
    setExecutionEvents(prev => [...prev, {
      type: 'visualization',
      content: 'Generating plots...',
      timestamp: new Date(),
      expanded: true,
      metadata: {
        imageUrl: mockImages[0],
        images: mockImages,
        caption: 'Generated visualization',
        code_complexity: metadata.complexity || 'unknown',
        variables_used: metadata.variables_created || []
      }
    }])
  }
  
  // Create enhanced execution event with Biomni metadata
  setExecutionEvents(prev => [...prev, {
    type: 'tool_call',
    content: code || 'Executing code...',
    timestamp: new Date(),
    expanded: code.length > 0,
    metadata: {
      tool_name: data.tool_name || 'run_python_repl',
      tool_id: data.tool_id,
      language: data.language || 'python',
      code: code,
      
      // Enhanced Biomni metadata
      complexity: metadata.complexity || 'unknown',
      variables_created: metadata.variables_created || [],
      function_calls: metadata.function_calls || [],
      imports: metadata.imports || [],
      execution_result: metadata.execution_result,
      execution_success: metadata.execution_success,
      step_number: metadata.step_number,
      
      // Biomni specific enhancements
      has_dataframe_ops: code.includes('DataFrame') || code.includes('pd.'),
      has_file_ops: code.includes('open(') || code.includes('.to_csv') || code.includes('.save'),
      has_scientific_ops: code.includes('Bio') || code.includes('sequence') || code.includes('molecular'),
      estimated_runtime: metadata.complexity === 'complex' ? 'high' : 'low'
    }
  }])
  
  // Update todos with enhanced progress tracking
  if (todos.length > 0) {
    const completed_count = Math.min(prev => prev.filter(t => t.completed).length + 1, todos.length)
    setTodos(prev => prev.map((todo, idx) => 
      idx < completed_count ? { ...todo, completed: true } : todo
    ))
  }
}

// Enhanced observation handler for Biomni's observe_blocks
export const handleEnhancedObservationEvent = (data, setExecutionEvents) => {
  console.log('Enhanced observation event:', data)
  
  const content = data.content || data.output || 'Observation from execution'
  const metadata = data.metadata || {}
  
  // Detect data types in observation
  let enhancedContent = content
  let eventType = 'observation'
  let iconType = 'eye'
  
  // Enhanced data detection from Biomni
  if (data.data_types) {
    if (data.data_types.dataframe) {
      enhancedContent = "📊 DataFrame Result:\n" + content
      iconType = 'table'
    } else if (data.data_types.file_operation) {
      enhancedContent = "📁 File Operation:\n" + content  
      iconType = 'file'
    } else if (data.data_types.dna_sequence) {
      enhancedContent = "🧬 DNA Sequence:\n" + content
      iconType = 'dna'
    } else if (data.data_types.measurements) {
      enhancedContent = "📏 Measurement:\n" + content
      iconType = 'ruler'
    }
  }
  
  // Handle errors and success with enhanced indicators
  if (data.has_errors) {
    enhancedContent = "❌ Execution Error:\n" + content
    eventType = 'error'
    iconType = 'alert'
  } else if (data.has_success) {
    enhancedContent = "✅ Execution Success:\n" + content
    iconType = 'check'
  }
  
  setExecutionEvents(prev => [...prev, {
    type: eventType,
    content: enhancedContent,
    timestamp: new Date(),
    expanded: data.has_errors || (metadata.enhanced && content.length < 200),
    metadata: {
      ...metadata,
      original_content: content,
      data_types: data.data_types || {},
      has_errors: data.has_errors,
      has_success: data.has_success,
      icon_type: iconType,
      
      // Biomni enhancements
      is_structured_data: !!(data.data_types && Object.keys(data.data_types).length > 0),
      is_scientific_output: !!(data.data_types && (data.data_types.dna_sequence || data.data_types.measurements)),
      content_length: content.length,
      processing_time: metadata.step_number ? `Step ${metadata.step_number}` : 'Unknown'
    }
  }])
}

// Enhanced planning handler for Biomni's todo_items
export const handleEnhancedPlanningEvent = (data, setTodos, setExecutionEvents) => {
  console.log('Enhanced planning event:', data)
  
  if (data.steps && Array.isArray(data.steps)) {
    // Convert Biomni todos to React format with enhancements
    const enhancedTodos = data.steps.map((step, index) => ({
      id: step.id || index + 1,
      text: typeof step === 'string' ? step : step.step || step.description || '',
      completed: step.status === 'completed',
      
      // Enhanced metadata from Biomni
      original_status: step.status,
      source: data.source || 'biomni',
      step_number: step.step_number || index + 1,
      estimated_complexity: step.complexity || 'unknown',
      has_code_execution: step.involves_code || false,
      has_file_operations: step.involves_files || false
    }))
    
    setTodos(enhancedTodos)
    
    // Add enhanced planning event to execution log
    setExecutionEvents(prev => [...prev, {
      type: 'planning',
      content: 'Strategic plan updated with enhanced metadata',
      timestamp: new Date(),
      expanded: false,
      metadata: { 
        steps: data.steps,
        total_steps: enhancedTodos.length,
        completed_steps: enhancedTodos.filter(t => t.completed).length,
        completion_rate: enhancedTodos.filter(t => t.completed).length / enhancedTodos.length,
        source: 'biomni_planning',
        has_enhancements: true
      }
    }])
  }
}

// Enhanced AI message handler with Biomni reasoning
export const handleEnhancedAiMessageEvent = (data, setCurrentStreamingMessage, setAccumulatedMessages, updateStatusStep, setExecutionEvents) => {
  const content = data.content || ''
  console.log('Enhanced ai_message event, length:', content.length)
  
  // Check for enhanced metadata from Biomni
  const metadata = data.metadata || {}
  const stepNumber = metadata.step_number || data.step_number
  
  // Enhanced content processing
  let processedContent = content
  
  // Check if this is Biomni reasoning content
  if (data.source === 'biomni_ai') {
    processedContent = "🧠 **AI Reasoning:**\n\n" + content
    
    // Add reasoning event to execution log
    setExecutionEvents(prev => [...prev, {
      type: 'reasoning',
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      timestamp: new Date(),
      expanded: false,
      metadata: {
        full_reasoning: content,
        step_number: stepNumber,
        source: 'biomni_reasoning',
        reasoning_length: content.length,
        contains_plan: content.toLowerCase().includes('plan'),
        contains_strategy: content.toLowerCase().includes('strategy') || content.toLowerCase().includes('approach')
      }
    }])
    
    updateStatusStep(3, 'active') // Reasoning step
  }
  
  // Handle solutions in AI messages with enhanced detection
  const solutionMatch = content.match(/<solution>([\s\S]*?)<\/solution>/)
  if (solutionMatch) {
    console.log('✅ Enhanced solution detection in ai_message!')
    const protocol = solutionMatch[1].trim()
    
    setAccumulatedMessages(prev => [...prev, `<solution>${protocol}</solution>`])
    setCurrentStreamingMessage('')
    updateStatusStep(6, 'completed')
    
    // Add enhanced solution event
    setExecutionEvents(prev => [...prev, {
      type: 'final_protocol',
      content: protocol,
      timestamp: new Date(),
      expanded: true,
      metadata: {
        solution_length: protocol.length,
        source: 'biomni_solution',
        step_number: stepNumber,
        is_protocol: protocol.toLowerCase().includes('protocol') || protocol.toLowerCase().includes('method'),
        is_comprehensive: protocol.length > 500
      }
    }])
  } else {
    // Regular AI message processing
    setAccumulatedMessages(prev => [...prev, processedContent])
    setCurrentStreamingMessage(processedContent)
  }
  
  updateStatusStep(2, 'active')
  if (content.includes('Updated plan:') || content.includes('Checklist') || content.toLowerCase().includes('plan:')) {
    updateStatusStep(4, 'active')
  }
}

// New handler for scientific data events from Biomni
export const handleScientificDataEvent = (data, setExecutionEvents) => {
  console.log('Scientific data event:', data)
  
  const scientificType = data.data_type || 'unknown'
  const content = data.content || ''
  
  let icon = '🔬'
  let eventColor = 'bg-green-500/10 border-green-500/20'
  
  switch (scientificType) {
    case 'dna_sequence':
      icon = '🧬'
      eventColor = 'bg-blue-500/10 border-blue-500/20'
      break
    case 'protein_sequence':
      icon = '🧪'
      eventColor = 'bg-purple-500/10 border-purple-500/20'
      break
    case 'measurement':
      icon = '📏'
      eventColor = 'bg-yellow-500/10 border-yellow-500/20'
      break
    case 'file_operation':
      icon = '📁'
      eventColor = 'bg-cyan-500/10 border-cyan-500/20'
      break
  }
  
  setExecutionEvents(prev => [...prev, {
    type: 'scientific_data',
    content: content,
    timestamp: new Date(),
    expanded: true,
    metadata: {
      scientific_type: scientificType,
      icon: icon,
      event_color: eventColor,
      sequence: data.sequence,
      length: data.length,
      value: data.value,
      unit: data.unit,
      filename: data.filename,
      file_path: data.file_path,
      source: 'biomni_scientific'
    }
  }])
}

// Enhanced final answer handler with Biomni solution metadata
export const handleEnhancedFinalAnswerEvent = (data, setAccumulatedMessages, setCurrentStreamingMessage, updateStatusStep, setMessages, setTodos, generatedImages) => {
  let finalContent = data.content || ''
  console.log('Enhanced final_answer event, length:', finalContent.length)
  
  // Enhanced solution processing
  const metadata = data.metadata || {}
  const isFromBiomni = metadata.source === 'biomni_solution'
  
  if (isFromBiomni) {
    finalContent = "🧬 **BIOMNI ANALYSIS RESULT**\n\n" + finalContent
  }
  
  // Remove any prompt instructions (existing logic)
  finalContent = finalContent.replace(/CRITICAL[^\n]*provide[^\n]*protocol[^\n]*/gi, '')
  finalContent = finalContent.replace(/End your response with[^\n]*/gi, '')
  
  // Enhanced solution processing
  const solutionMatch = finalContent.match(/<solution>([\s\S]*?)<\/solution>/)
  if (solutionMatch) {
    finalContent = solutionMatch[1].trim()
  }
  
  if (finalContent && finalContent.length > 10) {
    setAccumulatedMessages(prev => [...prev, `<solution>${finalContent}</solution>`])
    setCurrentStreamingMessage('📋 Enhanced Solution/Protocol Found!')
    updateStatusStep(6, 'completed')
    
    // Add enhanced solution to messages
    setMessages(prev => [...prev, {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: isFromBiomni 
        ? '## 🧬 **BIOMNI ANALYSIS PROTOCOL**\n\n' + finalContent
        : '## 📋 **EXPERIMENTAL PROTOCOL**\n\n' + finalContent,
      timestamp: new Date(),
      solution: finalContent,
      images: generatedImages.length > 0 ? generatedImages : undefined,
      
      // Enhanced metadata
      metadata: {
        source: isFromBiomni ? 'biomni' : 'default',
        solution_length: finalContent.length,
        step_number: metadata.step_number,
        is_comprehensive: finalContent.length > 500,
        contains_code: finalContent.includes('```') || finalContent.includes('python'),
        contains_protocol: finalContent.toLowerCase().includes('protocol') || finalContent.toLowerCase().includes('method')
      }
    }])
    
    // Mark todos as complete with enhanced tracking
    setTodos(prev => prev.map(todo => ({ 
      ...todo, 
      completed: true,
      completion_source: isFromBiomni ? 'biomni' : 'default',
      completion_timestamp: new Date().toISOString()
    })))
  }
}

// New handler for file operation events from Biomni
export const handleFileOperationEvent = (data, setExecutionEvents) => {
  console.log('File operation event:', data)
  
  const filename = data.metadata?.filename || 'unknown file'
  const filePath = data.metadata?.file_path || filename
  const fileType = data.metadata?.file_type || 'unknown'
  
  // File type specific icons and colors
  const fileIcons = {
    'sequence': '🧬',
    'tabular': '📊', 
    'structured': '📋',
    'image': '🖼️',
    'text': '📄',
    'unknown': '📎'
  }
  
  const icon = fileIcons[fileType] || '📁'
  
  setExecutionEvents(prev => [...prev, {
    type: 'file_operation',
    content: `${icon} File created: ${filename}`,
    timestamp: new Date(),
    expanded: true,
    metadata: {
      filename: filename,
      file_path: filePath,
      file_type: fileType,
      icon: icon,
      is_downloadable: true,
      source: 'biomni_file_op',
      
      // Enhanced file metadata
      is_scientific_file: ['sequence', 'tabular'].includes(fileType),
      is_result_file: filename.includes('result') || filename.includes('output'),
      file_extension: filename.split('.').pop()
    }
  }])
}

// Enhanced event router that detects Biomni events and routes to enhanced handlers
export const routeEnhancedEvent = (eventType, data, handlers) => {
  const {
    setExecutionEvents,
    setGeneratedImages, 
    setTodos,
    todos,
    setMessages,
    setCurrentStreamingMessage,
    setAccumulatedMessages,
    updateStatusStep,
    generatedImages
  } = handlers
  
  // Detect if this is from Biomni based on metadata
  const isFromBiomni = data.metadata?.source?.includes('biomni') || data.source?.includes('biomni')
  
  console.log(`Routing ${eventType} event, from Biomni: ${isFromBiomni}`)
  
  switch(eventType) {
    case 'tool_call':
      if (isFromBiomni) {
        handleEnhancedToolCallEvent(data, setExecutionEvents, setGeneratedImages, todos, setTodos)
      } else {
        // Use original handler for non-Biomni events
        handleOriginalToolCallEvent(data, setExecutionEvents, setGeneratedImages, todos, setTodos)
      }
      break
      
    case 'observation':
      if (isFromBiomni) {
        handleEnhancedObservationEvent(data, setExecutionEvents)
      } else {
        handleOriginalObservationEvent(data, setExecutionEvents)
      }
      break
      
    case 'final_answer':
      if (isFromBiomni) {
        handleEnhancedFinalAnswerEvent(data, setAccumulatedMessages, setCurrentStreamingMessage, updateStatusStep, setMessages, setTodos, generatedImages)
      } else {
        handleOriginalFinalAnswerEvent(data, setAccumulatedMessages, setCurrentStreamingMessage, updateStatusStep, setMessages, setTodos, generatedImages)
      }
      break
      
    case 'planning':
      if (isFromBiomni) {
        handleEnhancedPlanningEvent(data, setTodos, setExecutionEvents)
      } else {
        handleOriginalPlanningEvent(data, setTodos, setExecutionEvents)
      }
      break
      
    case 'ai_message':
      if (isFromBiomni) {
        handleEnhancedAiMessageEvent(data, setCurrentStreamingMessage, setAccumulatedMessages, updateStatusStep, setExecutionEvents)
      } else {
        handleOriginalAiMessageEvent(data, setCurrentStreamingMessage, setAccumulatedMessages, updateStatusStep, setExecutionEvents)
      }
      break
      
    // New Biomni-specific event types
    case 'scientific_data':
      handleScientificDataEvent(data, setExecutionEvents)
      break
      
    case 'file_operation':
      handleFileOperationEvent(data, setExecutionEvents)
      break
      
    default:
      console.log('Unknown enhanced event type:', eventType)
  }
}

// Placeholder functions for original handlers (to be replaced with actual handlers from the component)
const handleOriginalToolCallEvent = (data, setExecutionEvents, setGeneratedImages, todos, setTodos) => {
  // Original tool call logic
  console.log('Using original tool call handler')
}

const handleOriginalObservationEvent = (data, setExecutionEvents) => {
  // Original observation logic
  console.log('Using original observation handler')
}

const handleOriginalFinalAnswerEvent = (data, setAccumulatedMessages, setCurrentStreamingMessage, updateStatusStep, setMessages, setTodos, generatedImages) => {
  // Original final answer logic
  console.log('Using original final answer handler')
}

const handleOriginalPlanningEvent = (data, setTodos, setExecutionEvents) => {
  // Original planning logic
  console.log('Using original planning handler')
}

const handleOriginalAiMessageEvent = (data, setCurrentStreamingMessage, setAccumulatedMessages, updateStatusStep, setExecutionEvents) => {
  // Original AI message logic
  console.log('Using original AI message handler')
}