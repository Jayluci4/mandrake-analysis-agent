# Biomni Frontend - Backend Integration Guide

## Overview
The Biomni frontend is now ready to connect to your Python-based Biomni backend. This guide explains how to set up the connection and what endpoints are expected.

## Current Status ✅

### Frontend Features Implemented:
- **File Upload Zone** - Drag & drop biomedical files (FASTA, VCF, PDB, etc.)
- **Streaming Display** - Real-time execution details with LangGraph events
- **Session Management** - Multiple chat sessions with persistence
- **Message History** - Full chat interface with user/assistant messages
- **Mock API** - Currently using mock data for development
- **API Service Layer** - Complete API client ready for backend

## Backend Requirements

### Required Endpoints

The frontend expects these endpoints from your Biomni backend:

#### 1. **Chat Streaming** (Server-Sent Events)
```
GET /api/chat/stream
Query params:
  - message: string
  - session_id: string
  - file_ids: string[] (optional)

Returns: SSE stream with events:
  - planning
  - tool_call
  - tool_output
  - code_execution
  - visualization
  - final_result
  - error
```

#### 2. **Session Management**
```
POST   /api/sessions              - Create new session
GET    /api/sessions              - List all sessions
GET    /api/sessions/{id}         - Get session details
PATCH  /api/sessions/{id}         - Update session
DELETE /api/sessions/{id}         - Delete session
GET    /api/sessions/{id}/messages - Get session messages
```

#### 3. **File Management**
```
POST   /api/files/upload          - Upload file (multipart/form-data)
GET    /api/files/{id}            - Get file metadata
DELETE /api/files/{id}            - Delete file
GET    /api/sessions/{id}/files   - List files for session
```

#### 4. **Tools**
```
GET    /api/tools                 - List available tools
POST   /api/tools/{name}/execute  - Execute tool directly
GET    /api/tools/{name}/docs     - Get tool documentation
```

## Quick Start - Connect to Backend

### 1. Start Your Biomni Backend
```bash
# In your Biomni backend directory
python run_biomni_app.py
# or
python -m biomni.server
```

### 2. Configure Frontend Environment
Edit `.env` file in the frontend directory:
```env
# Point to your backend
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your_api_key_if_needed

# Switch from mock to real API
VITE_USE_MOCK_API=false
```

### 3. Test Connection
Click the "🔌 Test Backend" button in the header to verify connection.

Or open browser console and run:
```javascript
testBackend()
```

### 4. Switch to Real API
In `AppSimple.tsx`, change the streaming hook configuration:
```typescript
const { sendMessage, isStreaming, streamingEvents } = useBiomniStream({
  useMockApi: false,  // Change from true to false
  // ...
});
```

## Backend Implementation Example

### FastAPI SSE Endpoint (Python)
```python
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
import asyncio
import json

app = FastAPI()

@app.get("/api/chat/stream")
async def chat_stream(
    message: str = Query(...),
    session_id: str = Query(...),
    file_ids: str = Query(None)
):
    async def event_generator():
        # Planning event
        yield {
            "event": "planning",
            "data": json.dumps({
                "event_type": "planning",
                "content": f"Analyzing: {message}",
                "timestamp": datetime.now().isoformat()
            })
        }
        
        # Execute Biomni agent
        from biomni.agent import A1
        agent = A1()
        
        # Stream tool calls
        for event in agent.stream_go(message):
            yield {
                "event": event["type"],
                "data": json.dumps(event)
            }
        
        # Final result
        result = agent.go(message)
        yield {
            "event": "final_result",
            "data": json.dumps({
                "event_type": "final_result",
                "content": result,
                "timestamp": datetime.now().isoformat()
            })
        }
    
    return EventSourceResponse(event_generator())
```

### LangGraph Integration
```python
from langgraph.graph import Graph
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# Your LangGraph workflow
workflow = Graph()
# ... define nodes and edges ...

@app.get("/api/chat/stream")
async def langgraph_stream(message: str, session_id: str):
    async def stream_events():
        # Stream LangGraph events
        async for event in workflow.astream_events(
            {"input": message},
            version="v2"
        ):
            # Convert LangGraph events to our format
            if event["event"] == "on_tool_start":
                yield {
                    "event": "tool_call",
                    "data": json.dumps({
                        "tool_name": event["name"],
                        "parameters": event["data"]["input"]
                    })
                }
            # ... handle other event types ...
    
    return EventSourceResponse(stream_events())
```

## Event Format Examples

### Planning Event
```json
{
  "event_type": "planning",
  "content": "Analyzing protein sequence for structure prediction",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Tool Call Event
```json
{
  "event_type": "tool_call",
  "tool_name": "pubmed_search",
  "content": "Searching biomedical literature",
  "parameters": {
    "query": "CRISPR gene editing",
    "max_results": 10
  },
  "timestamp": "2024-01-15T10:30:01Z"
}
```

### Tool Output Event
```json
{
  "event_type": "tool_output",
  "tool_name": "pubmed_search",
  "content": "Found 8 relevant papers",
  "success": true,
  "execution_time": 1250,
  "timestamp": "2024-01-15T10:30:02Z"
}
```

### Code Execution Event
```json
{
  "event_type": "code_execution",
  "language": "python",
  "code": "import pandas as pd\ndf = pd.read_csv('data.csv')",
  "output": "Data loaded successfully",
  "status": "completed",
  "timestamp": "2024-01-15T10:30:03Z"
}
```

### Visualization Event
```json
{
  "event_type": "visualization",
  "viz_type": "plot",
  "title": "Gene Expression Heatmap",
  "data": {
    "x": ["Gene1", "Gene2", "Gene3"],
    "y": [1.2, 3.4, 2.1],
    "type": "bar"
  },
  "timestamp": "2024-01-15T10:30:04Z"
}
```

### Final Result Event
```json
{
  "event_type": "final_result",
  "content": "Analysis complete. The protein structure shows...",
  "metadata": {
    "total_tokens": 2500,
    "execution_time": 5000,
    "tools_used": ["alphafold", "pubmed_search", "protein_blast"]
  },
  "timestamp": "2024-01-15T10:30:05Z"
}
```

## CORS Configuration

Make sure your backend allows CORS from the frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing

1. **Test Backend Connection**: Click "🔌 Test Backend" button
2. **Check Console**: Open browser DevTools for detailed logs
3. **Mock Mode**: Set `VITE_USE_MOCK_API=true` to use mock data
4. **Real Mode**: Set `VITE_USE_MOCK_API=false` to use real backend

## Troubleshooting

### Connection Refused
- Check backend is running on correct port
- Verify VITE_API_URL in .env
- Check CORS settings

### No Streaming Events
- Ensure SSE endpoint returns proper EventSource format
- Check browser console for errors
- Verify event names match expected format

### File Upload Issues
- Check multipart/form-data handling
- Verify file size limits
- Ensure proper CORS for file uploads

## Next Steps

1. **Implement SSE endpoint** in your backend
2. **Add session persistence** to database
3. **Connect file uploads** to S3 or local storage
4. **Integrate actual Biomni tools** execution
5. **Add authentication** if needed

## Support

For issues or questions:
- Frontend: Check browser console for errors
- Backend: Monitor server logs
- API Testing: Use the "Test Backend" button

The frontend is now fully prepared to connect to your Biomni backend!