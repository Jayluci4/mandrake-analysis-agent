# Biomni Backend API Documentation for Frontend Integration

## Overview
The Biomni backend provides a streaming API that enables real-time updates for biomedical AI agent interactions. The API uses Server-Sent Events (SSE) for one-way streaming from server to client.

## Base Configuration
```javascript
const API_BASE = 'http://localhost:8000';  // Backend URL
```

## Primary Streaming Endpoint

### GET `/stream`
Main endpoint for executing queries with real-time streaming responses.

**Parameters:**
- `prompt` (string, required): The biomedical query or task

**Example Request:**
```javascript
const params = new URLSearchParams({
    prompt: "Design a gRNA to edit the BRCA1 gene"
});

const eventSource = new EventSource(`${API_BASE}/stream?${params}`);
```

**Response:** Server-Sent Events stream with JSON messages

## Event Types and Stream Structure

The streaming API sends different event types during execution, allowing the frontend to show real-time progress:

### 1. Planning Event
Sent when the agent is planning its approach to the task.

```json
{
    "event_type": "planning",
    "content": "Processing your query..."
}
```

**Frontend Usage:** Display as initial status or in a planning section to show the agent is thinking.

### 2. Tool Call Event
Sent when the agent decides to use a specific tool.

```json
{
    "event_type": "tool_call",
    "content": "Using molecular_biology.design_knockout_sgrna function",
    "tool_name": "design_knockout_sgrna",
    "parameters": {
        "gene_name": "BRCA1",
        "organism": "human"
    }
}
```

**Frontend Usage:** Show which tools are being invoked, can display as action cards or log entries.

### 3. Tool Output Event
Sent when a tool execution completes and returns results.

```json
{
    "event_type": "tool_output",
    "content": "Retrieved BRCA1 coding sequence: ATGGATTTATCTGCT...",
    "tool_name": "get_gene_coding_sequence",
    "success": true
}
```

**Frontend Usage:** Display intermediate results, can be shown in collapsible sections or as progress logs.

### 4. Final Result Event
Sent when the agent completes the task with the final answer.

```json
{
    "event_type": "final_result",
    "content": "The designed gRNA sequence for BRCA1 knockout is: AATCTTAGAGTGTCCCATCT\n\nThis 20-nucleotide sequence targets position 59 in the first exon..."
}
```

**Frontend Usage:** Display prominently as the main result, can be highlighted or shown in a results panel.

### 5. Error Event
Sent when an error occurs during processing.

```json
{
    "event_type": "error",
    "error": "Failed to retrieve gene sequence: Connection timeout",
    "recoverable": true
}
```

**Frontend Usage:** Show error messages, potentially with retry options if recoverable.

### 6. Complete Event
Sent when the entire process is finished.

```json
{
    "event_type": "complete"
}
```

**Frontend Usage:** Stop loading indicators, enable input for new queries.

## Frontend Implementation Example

### File Upload Handler
```javascript
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('File uploaded:', result.file_id);
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// Handle multiple files
async function uploadMultipleFiles(files) {
    const uploadPromises = Array.from(files).map(file => uploadFile(file));
    const results = await Promise.all(uploadPromises);
    return results;
}

// Use uploaded files in query
async function queryWithFiles(prompt, fileRefs) {
    // Append file references to prompt
    const enhancedPrompt = fileRefs.length > 0 
        ? `${prompt} Files: ${fileRefs.join(', ')}`
        : prompt;
    
    streamQuery(enhancedPrompt);
}
```

### Setting Up SSE Connection
```javascript
function streamQuery(prompt) {
    // Close any existing connection
    if (eventSource) {
        eventSource.close();
    }
    
    // Create new SSE connection
    const params = new URLSearchParams({
        prompt: prompt
    });
    
    eventSource = new EventSource(`${API_BASE}/stream?${params}`);
    
    // Handle incoming events
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleStreamEvent(data);
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        updateStatus('error', 'Connection lost');
        eventSource.close();
    };
}
```

### Event Handler
```javascript
function handleStreamEvent(data) {
    switch(data.event_type) {
        case 'planning':
            // Show planning phase
            addEventToUI({
                type: 'planning',
                content: data.content,
                timestamp: new Date(),
                icon: '🤔'
            });
            updateStatus('processing', 'Planning approach...');
            break;
            
        case 'tool_call':
            // Show tool being called
            addEventToUI({
                type: 'tool_call',
                content: `Calling: ${data.tool_name}`,
                details: data.parameters,
                timestamp: new Date(),
                icon: '🔧'
            });
            updateStatus('processing', `Using ${data.tool_name}...`);
            break;
            
        case 'tool_output':
            // Show tool results
            addEventToUI({
                type: 'tool_output',
                content: data.content,
                tool: data.tool_name,
                timestamp: new Date(),
                icon: '📊'
            });
            break;
            
        case 'final_result':
            // Display final answer prominently
            addEventToUI({
                type: 'final_result',
                content: data.content,
                timestamp: new Date(),
                icon: '✅',
                highlight: true
            });
            updateStatus('ready', 'Task completed');
            break;
            
        case 'error':
            // Show error message
            addEventToUI({
                type: 'error',
                content: data.error,
                timestamp: new Date(),
                icon: '❌'
            });
            updateStatus('error', 'Error occurred');
            break;
            
        case 'complete':
            // Clean up
            updateStatus('ready', 'Ready for new query');
            eventSource.close();
            eventSource = null;
            break;
    }
}
```

### UI Update Functions
```javascript
function addEventToUI(event) {
    const eventElement = document.createElement('div');
    eventElement.className = `event ${event.type}`;
    
    eventElement.innerHTML = `
        <div class="event-header">
            <span class="event-icon">${event.icon}</span>
            <span class="event-type">${event.type.replace('_', ' ')}</span>
            <span class="event-time">${event.timestamp.toLocaleTimeString()}</span>
        </div>
        <div class="event-content ${event.highlight ? 'highlight' : ''}">
            ${formatContent(event.content)}
        </div>
    `;
    
    document.getElementById('events-container').appendChild(eventElement);
    
    // Auto-scroll to latest
    eventElement.scrollIntoView({ behavior: 'smooth' });
}

function updateStatus(state, message) {
    const statusElement = document.getElementById('status');
    statusElement.className = `status ${state}`;
    statusElement.textContent = message;
}
```

## Real-Time Update Flow

### Typical Query Execution Flow:
1. **User submits query** → Frontend initiates SSE connection
2. **Planning phase** → `planning` event shows agent is analyzing the task
3. **Tool selection** → Multiple `tool_call` events as agent selects tools
4. **Tool execution** → `tool_output` events with intermediate results
5. **Final answer** → `final_result` event with complete solution
6. **Completion** → `complete` event to signal end

### Example Event Sequence for gRNA Design:
```javascript
// 1. Planning
{"event_type": "planning", "content": "Analyzing BRCA1 gene knockout requirements..."}

// 2. Tool call - Retrieve sequence
{"event_type": "tool_call", "tool_name": "get_gene_coding_sequence", "parameters": {"gene_name": "BRCA1"}}

// 3. Tool output - Sequence retrieved
{"event_type": "tool_output", "content": "Retrieved 5951 bp BRCA1 coding sequence", "tool_name": "get_gene_coding_sequence"}

// 4. Tool call - Analyze for gRNA sites
{"event_type": "tool_call", "tool_name": "find_pam_sites", "parameters": {"sequence": "...", "pam": "NGG"}}

// 5. Tool output - Sites found
{"event_type": "tool_output", "content": "Found 4 suitable gRNA target sites in first exon", "tool_name": "find_pam_sites"}

// 6. Final result
{"event_type": "final_result", "content": "Recommended gRNA: AATCTTAGAGTGTCCCATCT (position 59, first exon)"}

// 7. Complete
{"event_type": "complete"}
```

### Example Event Sequence with File Analysis:
```javascript
// User uploads gene_expression.csv and queries: "Analyze @file:abc123 for upregulated genes"

// 1. Planning
{"event_type": "planning", "content": "Loading and analyzing gene expression data..."}

// 2. Tool call - Load file
{"event_type": "tool_call", "tool_name": "load_csv", "parameters": {"file_ref": "@file:abc123"}}

// 3. Tool output - File loaded
{"event_type": "tool_output", "content": "Loaded 15,234 gene expression measurements from 6 samples"}

// 4. Tool call - Statistical analysis
{"event_type": "tool_call", "tool_name": "differential_expression", "parameters": {"threshold": 2.0, "p_value": 0.05}}

// 5. Tool output - Analysis complete
{"event_type": "tool_output", "content": "Identified 342 significantly upregulated genes (fold change > 2, p < 0.05)"}

// 6. Final result
{"event_type": "final_result", "content": "Analysis complete: Found 342 upregulated genes.\n\nTop 5 upregulated genes:\n1. BRCA1 (fold change: 4.2)\n2. TP53 (fold change: 3.8)\n..."}

// 7. Complete
{"event_type": "complete"}
```

## File Upload and Management

### POST `/upload`
Upload files for analysis. Files are stored and can be referenced in queries.

**Request:** Multipart form data
- `file`: The file to upload (required)
- `description`: Optional description of the file

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Gene expression data from experiment A');

const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
});

const result = await response.json();
// Returns: { "file_id": "abc123...", "reference": "@file:abc123..." }
```

**Response:**
```json
{
    "file_id": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "@file:550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "original_name": "gene_expression.csv",
        "size": 45678,
        "type": ".csv",
        "uploaded_at": "2024-01-17T10:30:00Z"
    }
}
```

### Using Files in Queries
Once uploaded, files can be referenced in queries using the `@file:` notation:

```javascript
// Upload file first
const uploadResponse = await uploadFile(myFile);
const fileRef = uploadResponse.reference;

// Use file reference in query
const prompt = `Analyze the gene expression patterns in ${fileRef} and identify upregulated genes`;

const params = new URLSearchParams({ prompt: prompt });
const eventSource = new EventSource(`${API_BASE}/stream?${params}`);
```

**Example Queries with Files:**
```javascript
// Single file
"Analyze the mutations in @file:550e8400-e29b-41d4-a716-446655440000"

// Multiple files
"Compare @file:file1_id with @file:file2_id and identify differences"

// With context
"Using the data in @file:abc123, design primers for the top 5 expressed genes"
```

### GET `/files/{file_id}`
Get metadata and download URL for an uploaded file.

**Response:**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "original_name": "gene_expression.csv",
    "size": 45678,
    "type": ".csv",
    "uploaded_at": "2024-01-17T10:30:00Z",
    "download_url": "https://..."  // Presigned URL for download
}
```

### Supported File Types
The backend supports various biomedical file formats:
- **General**: `.csv`, `.txt`, `.json`, `.xlsx`, `.xls`, `.tsv`, `.pdf`
- **Sequence**: `.fasta`, `.fastq`
- **Genomics**: `.vcf`, `.bed`, `.gff`, `.gtf`, `.bam`, `.sam`
- **Big Data**: `.parquet`, `.h5`, `.hdf5`, `.bigwig`, `.bigbed`
- **Images**: `.png`, `.jpg`, `.jpeg`

**Maximum file size:** 500MB

## Additional Endpoints

### POST `/execute`
Non-streaming endpoint for simple queries (fallback option).

**Request Body:**
```json
{
    "prompt": "What is the function of the p53 gene?"
}
```

**Response:**
```json
{
    "result": "The p53 gene is a tumor suppressor...",
    "log": "Execution log details..."
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2024-01-17T10:30:00Z"
}
```

## Error Handling

### Connection Errors
```javascript
eventSource.onerror = (error) => {
    if (eventSource.readyState === EventSource.CLOSED) {
        // Connection closed by server
        console.log('Stream ended normally');
    } else {
        // Actual error
        console.error('Stream error:', error);
        // Attempt reconnection after delay
        setTimeout(() => {
            retryConnection();
        }, 5000);
    }
};
```

### Timeout Handling
```javascript
let timeout;
const TIMEOUT_DURATION = 300000; // 5 minutes

function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        if (eventSource) {
            eventSource.close();
            updateStatus('error', 'Query timeout');
        }
    }, TIMEOUT_DURATION);
}

// Reset timeout on each event
eventSource.onmessage = (event) => {
    resetTimeout();
    // ... handle event
};
```

## Best Practices

1. **Stream Management**
   - Always close existing EventSource before creating new one
   - Handle connection errors gracefully with retry logic
   - Implement timeout for long-running queries

2. **UI Updates**
   - Show real-time status changes for better UX
   - Use different visual styles for different event types
   - Maintain event history for user reference
   - Auto-scroll to latest events

3. **Performance**
   - Limit displayed event history (e.g., last 100 events)
   - Use virtual scrolling for long event lists
   - Debounce rapid UI updates

4. **User Experience**
   - Show clear loading states during processing
   - Provide ability to cancel running queries
   - Display execution time for each phase
   - Allow copying of results

## Testing the API

### Manual Testing with curl:
```bash
# Test streaming endpoint
curl -N "http://localhost:8000/stream?prompt=test"

# Test health check
curl "http://localhost:8000/health"
```

### Browser Console Testing:
```javascript
// Quick test in browser console
const es = new EventSource('http://localhost:8000/stream?prompt=test');
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Current Implementation Status

### Working Features:
- ✅ Basic SSE streaming
- ✅ Query execution with A1 agent
- ✅ Error handling
- ✅ Health check endpoint

### Known Limitations:
- The current `simple_api.py` uses a fallback approach since `go_stream_detailed` method is not available in the installed biomni package
- Events are simulated rather than truly streamed from LangGraph
- File upload endpoints are not implemented in the simple version

### Frontend Connection Issues Resolution:
If the frontend doesn't show updates:
1. Check browser console for CORS errors
2. Verify backend is running on port 8000
3. Ensure frontend JavaScript is parsing SSE data correctly
4. Check network tab for SSE connection status