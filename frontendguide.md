# Bio Agent Backend API Guide for Frontend Development

## Overview

The Bio Agent Backend provides a FastAPI-based REST API with WebSocket support for real-time search updates. The backend orchestrates AI agents that search biological/medical literature and provide comprehensive analysis.

**Base URL**: `http://localhost:8000`

## Authentication

Currently, the API does not require authentication. CORS is configured to allow all origins (`*`).

## Data Models

### SearchRequest
```typescript
interface SearchRequest {
  query: string;                    // The search query
  toggles: {                       // Feature toggles
    search: boolean;               // Enable/disable search (default: true)
  };
}
```

### SearchResult
```typescript
interface SearchResult {
  query: string;                   // Original query
  papers: Paper[];                 // List of found papers
  analysis: string;                // AI-generated analysis
  raw_data: any;                   // Raw search data (for caching)
  tool_calls?: ToolCall[];         // Which search tools were used
  reasoning_trace?: ReasoningStep[]; // Agent's reasoning process
}
```

### Paper
```typescript
interface Paper {
  title: string;                   // Paper title
  abstract: string;                // Paper abstract
  authors: string[];               // List of authors
  citations: number;               // Citation count (default: 0)
  publication_date?: string;       // ISO date string
  hyperlink: string;               // URL to paper
  source: string;                  // Source (PubMed, bioRxiv, etc.)
  doi?: string;                    // Digital Object Identifier
  journal?: string;                // Journal or venue name
}
```

### ToolCall
```typescript
interface ToolCall {
  tool: string;                    // Tool name (e.g., "search_pubmed")
  query: string;                   // Query sent to tool
  papers_found: number;            // Number of papers found
  duration: number;                // Execution time in seconds
  error?: string;                  // Error message if failed
}
```

## REST API Endpoints

### 1. Health Check
**GET** `/health`

Check if the backend is running.

**Response:**
```json
{
  "status": "healthy"
}
```

### 2. Debug Configuration
**GET** `/debug/config`

Get current backend configuration (for debugging).

**Response:**
```json
{
  "status": "debug",
  "env": {
    "ENDPOINT_URL": "https://mandrakebioworkswestus.openai.azure.com/",
    "DEPLOYMENT_NAME": "gpt-4.1",
    "AZURE_OPENAI_GPT4O_DEPLOYMENT_NAME": "o4-mini",
    "API_KEY_SET": true
  },
  "loaded_at": "2025-01-24T12:00:00Z"
}
```

### 3. Test Search
**GET** `/debug/test-search`

Run a simple test search (timeout: 5 seconds).

**Response:**
```json
{
  "status": "success",
  "result": {
    "papers": [...],
    "total": 2
  }
}
```

### 4. Initiate Search
**POST** `/search`

Start a new search. This endpoint returns immediately with a task ID, and the actual search runs asynchronously.

**Request Body:**
```json
{
  "query": "How can we develop early maturity in rice in punjab",
  "toggles": {
    "search": true
  }
}
```

**Response:**
```json
{
  "task_id": "task_7b3eea77",
  "status": "in_progress",
  "message": "Search started"
}
```

**Error Response (400):**
```json
{
  "detail": "No agents enabled"
}
```

### 5. Get Task Status
**GET** `/task/{task_id}`

Get the current status and results of a search task.

**Response (In Progress):**
```json
{
  "task_id": "task_7b3eea77",
  "status": "in_progress",
  "query": "How can we develop early maturity in rice in punjab"
}
```

**Response (Completed):**
```json
{
  "task_id": "task_7b3eea77",
  "status": "completed",
  "query": "How can we develop early maturity in rice in punjab",
  "result": {
    "query": "How can we develop early maturity in rice in punjab",
    "papers": [
      {
        "title": "SpeedyPaddy: a revolutionized cost-effective protocol...",
        "abstract": "We present a novel breeding protocol...",
        "authors": ["Smith, J.", "Doe, A.", "Kumar, R."],
        "citations": 42,
        "publication_date": "2024-07-15T00:00:00Z",
        "hyperlink": "https://pubmed.ncbi.nlm.nih.gov/12345678",
        "source": "pubmed",
        "doi": "10.1186/s13007-024-01235-x",
        "journal": "Plant Methods"
      }
    ],
    "analysis": "Based on the research, developing early maturity in rice...",
    "raw_data": {...},
    "tool_calls": [
      {
        "tool": "search_pubmed",
        "query": "early maturity rice Punjab",
        "papers_found": 15,
        "duration": 2.3
      }
    ]
  }
}
```

**Response (Failed):**
```json
{
  "task_id": "task_7b3eea77",
  "status": "failed",
  "query": "How can we develop early maturity in rice in punjab",
  "error": "Connection timeout to search API"
}
```

### 6. WebSocket Status
**GET** `/ws/status`

Get information about active WebSocket connections.

**Response:**
```json
{
  "active_connections": 2,
  "connection_ids": ["task_7b3eea77", "task_8c4ffb88"]
}
```

## WebSocket API

### Connection
**WebSocket URL**: `ws://localhost:8000/ws/{task_id}`

Connect to this endpoint after receiving a task_id from the `/search` endpoint to receive real-time updates.

### Message Types

#### 1. Connected Message
Sent immediately after connection is established.
```json
{
  "type": "connected",
  "task_id": "task_7b3eea77"
}
```

#### 2. Progress Updates
Sent during search execution to show progress.
```json
{
  "type": "progress",
  "data": {
    "progress": 25,
    "current_step": "Searching PubMed database",
    "message": "Found 15 relevant papers..."
  },
  "timestamp": "2025-01-24T12:00:00Z"
}
```

#### 2a. Paper Streaming Updates (NEW)
Papers are now streamed as soon as they're found, before the full analysis is complete.
```json
{
  "type": "papers",
  "data": {
    "papers": [
      {
        "title": "SpeedyPaddy: a revolutionized cost-effective protocol...",
        "abstract": "We present a novel breeding protocol...",
        "authors": ["Smith, J.", "Doe, A.", "Kumar, R."],
        "citations": 42,
        "publication_date": "2024-07-15T00:00:00Z",
        "hyperlink": "https://pubmed.ncbi.nlm.nih.gov/12345678",
        "source": "pubmed",
        "doi": "10.1186/s13007-024-01235-x",
        "journal": "Plant Methods"
      }
    ],
    "phase": "initial",  // "initial" for first search, "additional" for second search
    "count": 15,
    "message": "Found 15 papers in initial search"
  },
  "timestamp": "2025-01-24T12:00:30Z"
}
```

#### 3. Summary Streaming (NEW)
The final analysis is now streamed in real-time as it's being generated.
```json
{
  "type": "summary_stream",
  "data": {
    "chunk": "Based on the comprehensive research, developing early maturity in rice varieties for Punjab requires targeting specific genes...",
    "message": "Streaming analysis..."
  },
  "timestamp": "2025-01-24T12:04:00Z"
}
```

#### 4. Final Result
Sent when search is completed with the full analysis.
```json
{
  "type": "result",
  "data": {
    "query": "How can we develop early maturity in rice in punjab",
    "papers": [...],
    "analysis": "...",  // Complete analysis (same as concatenated stream chunks)
    "tool_calls": [...]
  },
  "timestamp": "2025-01-24T12:05:00Z"
}
```

#### 4. Error Message
Sent if search fails.
```json
{
  "type": "error",
  "data": {
    "error": "Search timeout: Unable to connect to PubMed"
  },
  "timestamp": "2025-01-24T12:05:00Z"
}
```

## Typical Frontend Flow

1. **User enters query** → Frontend validates input
2. **POST to `/search`** → Get task_id
3. **Connect WebSocket** to `/ws/{task_id}`
4. **Show progress** → Update UI based on progress messages
5. **Display results** → Show papers and analysis when received
6. **Handle errors** → Show appropriate error messages

## Example Frontend Implementation (React/TypeScript)

```typescript
// 1. Submit Search
async function submitSearch(query: string) {
  const response = await fetch('http://localhost:8000/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, toggles: { search: true } })
  });
  
  const data = await response.json();
  return data.task_id;
}

// 2. Connect WebSocket
function connectWebSocket(taskId: string) {
  const ws = new WebSocket(`ws://localhost:8000/ws/${taskId}`);
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'connected':
        console.log('Connected to search task');
        break;
        
      case 'progress':
        updateProgressBar(message.data.progress);
        updateStatusText(message.data.message);
        break;
        
      case 'papers':  // NEW: Papers streaming
        displayPapersImmediately(message.data.papers, message.data.phase);
        updatePaperCount(message.data.count);
        break;
        
      case 'summary_stream':  // NEW: Summary streaming
        appendToAnalysis(message.data.chunk);
        break;
        
      case 'result':
        displayFinalResults(message.data);
        ws.close();
        break;
        
      case 'error':
        showError(message.data.error);
        ws.close();
        break;
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Fallback to polling
    pollTaskStatus(taskId);
  };
}

// 3. Fallback Polling (if WebSocket fails)
async function pollTaskStatus(taskId: string) {
  const pollInterval = setInterval(async () => {
    const response = await fetch(`http://localhost:8000/task/${taskId}`);
    const data = await response.json();
    
    if (data.status === 'completed') {
      displayResults(data.result);
      clearInterval(pollInterval);
    } else if (data.status === 'failed') {
      showError(data.error);
      clearInterval(pollInterval);
    }
  }, 2000); // Poll every 2 seconds
}
```

## Error Handling

### Common Error Scenarios

1. **WebSocket Connection Failed**
   - Fallback to polling `/task/{task_id}` endpoint
   - Show connection error to user

2. **Search Timeout**
   - Backend has built-in timeouts
   - User should be able to retry

3. **No Results Found**
   - Papers array will be empty
   - Analysis will explain why no results

4. **API Key Issues**
   - Backend will return 500 error
   - Check `/debug/config` endpoint

## Performance Considerations

1. **Search Duration**: Searches typically take 30-120 seconds
2. **WebSocket Ping/Pong**: Configured with 20s ping interval
3. **Connection Timeout**: 75 seconds keep-alive
4. **Progress Updates**: Sent approximately every 5-10 seconds

## Environment Configuration

The backend requires these environment variables:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-api-key
ENDPOINT_URL=https://mandrakebioworkswestus.openai.azure.com/
DEPLOYMENT_NAME=gpt-4.1
AZURE_OPENAI_GPT4O_DEPLOYMENT_NAME=o4-mini

# DeepSeek Configuration (if using DeepSeek R1)
DEEPSEEK_API_KEY=your-deepseek-key
```

## CORS Configuration

The backend allows all origins by default. For production, update CORS settings in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)
```

## Notes for Frontend Developers

1. **Always handle WebSocket failures** - Have polling as fallback
2. **Show search progress** - Users expect feedback for long operations
3. **Cache results locally** - Searches are expensive, avoid duplicates
4. **Validate queries** - Empty or very short queries should be rejected
5. **Handle rate limits** - Though not currently implemented, plan for it
6. **Display paper counts** - Show how many papers were found from each source
7. **Make papers clickable** - Use the hyperlink field to open papers
8. **Format the analysis** - The analysis field contains markdown-formatted text