// AIDEV-NOTE: Intelligent SSE Parser using Gemini AI for complex message bifurcation
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini (you'll need to add your API key to .env)
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_API_KEY')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export interface ParsedSSEEvent {
  type: 'reasoning' | 'planning' | 'tool_call' | 'observation' | 'final_answer' | 'error' | 'status' | 'visualization'
  content: string
  metadata?: {
    toolName?: string
    language?: string
    code?: string
    steps?: any[]
    progress?: number
    reasoning?: string
    observation?: string
    error?: string
    images?: string[]
    plotType?: string
  }
  displaySide: 'left' | 'right' | 'both'
  priority: 'high' | 'medium' | 'low'
  timestamp: Date
}

// Cache for parsed messages to avoid re-parsing
const messageCache = new Map<string, ParsedSSEEvent[]>()

// Pattern matchers for quick initial classification
const patterns = {
  reasoning: /\*\*Reasoning:\*\*|\*\*Thinking Process:\*\*/i,
  planning: /\*\*Plan Checklist:\*\*|Step \d+:|Updated plan:/i,
  toolCall: /<execute>|from biomni\.tool\.|import |print\(/i,
  observation: /<observation>|<\/observation>/i,
  finalAnswer: /<solution>|<\/solution>|EXPERIMENTAL PROTOCOL/i,
  error: /Error:|Failed:|Invalid|cannot proceed/i,
  aiMessage: /================================== Ai Message ==================================/,
  humanMessage: /================================ Human Message =================================/,
  visualization: /plt\.show\(\)|plt\.savefig|matplotlib|seaborn|plotly|figure\(figsize/i
}

export class IntelligentSSEParser {
  private static instance: IntelligentSSEParser
  private messageBuffer: string = ''
  private currentContext: string = ''
  
  private constructor() {}
  
  static getInstance(): IntelligentSSEParser {
    if (!IntelligentSSEParser.instance) {
      IntelligentSSEParser.instance = new IntelligentSSEParser()
    }
    return IntelligentSSEParser.instance
  }

  // Quick pattern-based classification for real-time processing
  private quickClassify(content: string): string {
    if (patterns.finalAnswer.test(content)) return 'final_answer'
    if (patterns.visualization.test(content) && patterns.toolCall.test(content)) return 'visualization'
    if (patterns.toolCall.test(content)) return 'tool_call'
    if (patterns.observation.test(content)) return 'observation'
    if (patterns.reasoning.test(content)) return 'reasoning'
    if (patterns.planning.test(content)) return 'planning'
    if (patterns.error.test(content)) return 'error'
    return 'status'
  }

  // Extract key information from content
  private extractMetadata(content: string, type: string): any {
    const metadata: any = {}
    
    switch(type) {
      case 'tool_call':
        // Extract function name
        const funcMatch = content.match(/from biomni\.tool\.(\w+) import (\w+)/)
        if (funcMatch) {
          metadata.toolName = funcMatch[2]
        }
        // Extract code
        const codeMatch = content.match(/<execute>([\s\S]*?)<\/execute>/)
        if (codeMatch) {
          metadata.code = codeMatch[1].trim()
          metadata.language = 'python'
        }
        break
        
      case 'planning':
        // Extract steps from checklist
        const steps = content.match(/\d+\.\s*\[[\s✓✗]\]\s*([^\n]+)/g)
        if (steps) {
          metadata.steps = steps.map(step => {
            const match = step.match(/\d+\.\s*\[([\s✓✗])\]\s*(.+)/)
            return {
              completed: match?.[1] === '✓',
              text: match?.[2] || step
            }
          })
        }
        break
        
      case 'observation':
        // Extract observation content
        const obsMatch = content.match(/<observation>([\s\S]*?)<\/observation>/)
        if (obsMatch) {
          metadata.observation = obsMatch[1].trim()
        }
        break
        
      case 'final_answer':
        // Extract solution content
        const solMatch = content.match(/<solution>([\s\S]*?)<\/solution>/)
        if (solMatch) {
          metadata.solution = solMatch[1].trim()
        }
        break
        
      case 'visualization':
        // Extract plot type and detect visualization
        if (content.includes('plt.figure')) {
          metadata.plotType = 'matplotlib'
        } else if (content.includes('seaborn')) {
          metadata.plotType = 'seaborn'
        } else if (content.includes('plotly')) {
          metadata.plotType = 'plotly'
        }
        // Mark that this code block generates a visualization
        metadata.generatesImage = true
        break
    }
    
    return metadata
  }

  // Determine which panel should display this event
  private determineDisplaySide(type: string, content: string): 'left' | 'right' | 'both' {
    // Final answers and main messages go to left panel
    if (type === 'final_answer' || content.includes('EXPERIMENTAL PROTOCOL')) {
      return 'left'
    }
    
    // Execution details go to right panel
    if (['reasoning', 'planning', 'tool_call', 'observation'].includes(type)) {
      return 'right'
    }
    
    // Errors might need to be shown in both
    if (type === 'error' && content.includes('critical')) {
      return 'both'
    }
    
    return 'right'
  }

  // Parse SSE message intelligently
  async parseSSEMessage(message: string): Promise<ParsedSSEEvent[]> {
    const events: ParsedSSEEvent[] = []
    
    // Check cache first
    const cacheKey = message.substring(0, 100)
    if (messageCache.has(cacheKey)) {
      return messageCache.get(cacheKey)!
    }

    try {
      // Quick classification
      const type = this.quickClassify(message)
      const metadata = this.extractMetadata(message, type)
      const displaySide = this.determineDisplaySide(type, message)
      
      // Create primary event
      const primaryEvent: ParsedSSEEvent = {
        type: type as any,
        content: this.summarizeContent(message, type),
        metadata,
        displaySide,
        priority: type === 'final_answer' ? 'high' : 'medium',
        timestamp: new Date()
      }
      
      events.push(primaryEvent)
      
      // For complex messages, use Gemini for deeper analysis (optional, for heavy processing)
      if (message.length > 1000 && type === 'reasoning') {
        try {
          const geminiAnalysis = await this.analyzeWithGemini(message)
          if (geminiAnalysis) {
            events.push(...geminiAnalysis)
          }
        } catch (error) {
          console.log('Gemini analysis skipped:', error)
        }
      }
      
      // Cache the result
      messageCache.set(cacheKey, events)
      
    } catch (error) {
      console.error('Error parsing SSE message:', error)
      events.push({
        type: 'status',
        content: message.substring(0, 200),
        displaySide: 'right',
        priority: 'low',
        timestamp: new Date()
      })
    }
    
    return events
  }

  // Summarize content based on type
  private summarizeContent(content: string, type: string): string {
    const maxLength = 200
    
    switch(type) {
      case 'reasoning':
        const reasoningMatch = content.match(/\*\*Reasoning:\*\*([\s\S]{0,200})/)
        return reasoningMatch ? reasoningMatch[1].trim() : content.substring(0, maxLength)
        
      case 'planning':
        const steps = content.match(/\d+\.\s*\[[\s✓✗]\]\s*([^\n]+)/g)
        if (steps && steps.length > 0) {
          return `Creating ${steps.length}-step execution plan`
        }
        return 'Planning task execution...'
        
      case 'tool_call':
        const toolMatch = content.match(/(\w+)\(/) || content.match(/import (\w+)/)
        if (toolMatch) {
          return `Executing: ${toolMatch[1]}`
        }
        return 'Running analysis tool...'
        
      case 'observation':
        const obsContent = content.match(/<observation>([\s\S]{0,100})/)
        if (obsContent) {
          return obsContent[1].trim() + '...'
        }
        return 'Processing results...'
        
      case 'final_answer':
        return 'Protocol generated and delivered successfully!'
        
      default:
        return content.substring(0, maxLength)
    }
  }

  // Optional: Use Gemini for complex message analysis
  private async analyzeWithGemini(message: string): Promise<ParsedSSEEvent[]> {
    try {
      const prompt = `
        Analyze this AI execution log and extract key events.
        Return a JSON array of events with: type, content (max 100 chars), and importance.
        Focus on: reasoning steps, tool calls, and results.
        
        Log:
        ${message.substring(0, 1000)}
        
        Return only valid JSON array.
      `
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Try to parse the JSON response
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            type: item.type || 'status',
            content: item.content || '',
            metadata: item.metadata || {},
            displaySide: 'right' as const,
            priority: item.importance || 'medium',
            timestamp: new Date()
          }))
        }
      } catch (e) {
        console.log('Failed to parse Gemini response as JSON')
      }
    } catch (error) {
      console.error('Gemini analysis failed:', error)
    }
    
    return []
  }

  // Parse backend log format (like in right_panel_analysis_agent.txt)
  parseBackendLog(logContent: string): ParsedSSEEvent[] {
    const events: ParsedSSEEvent[] = []
    const lines = logContent.split('\n')
    
    let currentBlock = ''
    let currentType = 'status'
    let inExecuteBlock = false
    let inObservationBlock = false
    let inSolutionBlock = false
    
    for (const line of lines) {
      // Detect AI Message blocks
      if (line.includes('================================== Ai Message')) {
        if (currentBlock) {
          events.push(this.createEventFromBlock(currentBlock, currentType))
        }
        currentBlock = ''
        currentType = 'reasoning'
      }
      // Detect execute blocks
      else if (line.includes('<execute>')) {
        inExecuteBlock = true
        currentType = 'tool_call'
        currentBlock = ''
      }
      else if (line.includes('</execute>')) {
        inExecuteBlock = false
        events.push(this.createEventFromBlock(currentBlock, 'tool_call'))
        currentBlock = ''
      }
      // Detect observation blocks
      else if (line.includes('<observation>')) {
        inObservationBlock = true
        currentType = 'observation'
        currentBlock = ''
      }
      else if (line.includes('</observation>')) {
        inObservationBlock = false
        events.push(this.createEventFromBlock(currentBlock, 'observation'))
        currentBlock = ''
      }
      // Detect solution blocks
      else if (line.includes('<solution>')) {
        inSolutionBlock = true
        currentType = 'final_answer'
        currentBlock = ''
      }
      else if (line.includes('</solution>')) {
        inSolutionBlock = false
        events.push(this.createEventFromBlock(currentBlock, 'final_answer'))
        currentBlock = ''
      }
      // Accumulate content
      else {
        currentBlock += line + '\n'
      }
    }
    
    return events
  }

  private createEventFromBlock(content: string, type: string): ParsedSSEEvent {
    return {
      type: type as any,
      content: this.summarizeContent(content, type),
      metadata: this.extractMetadata(content, type),
      displaySide: this.determineDisplaySide(type, content),
      priority: type === 'final_answer' ? 'high' : 'medium',
      timestamp: new Date()
    }
  }
}

// Export singleton instance
export const sseParser = IntelligentSSEParser.getInstance()