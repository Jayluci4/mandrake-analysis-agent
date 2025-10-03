#!/usr/bin/env python3
"""
SSE Bridge Server for Biomni → React Frontend Integration
Transforms Biomni's JSON object streaming into SSE events for React frontend
"""

import os
import sys
import json
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Add Biomni to path
load_dotenv()
biomni_path = Path(__file__).parent.parent / "Biomni"
sys.path.insert(0, str(biomni_path))

from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the comprehensive transformer
from json_transformer import BiomniSSEBridge

app = FastAPI(title="Biomni SSE Bridge", description="Bridge between Biomni agent and React frontend")

# Enable CORS for React frontend - AIDEV-NOTE: Enhanced for SSE streaming
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://10.128.0.6:3000", "*"],  # Allow frontend domains
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # SSE needs GET
    allow_headers=["*", "Cache-Control", "Connection"],  # SSE specific headers
)

# Initialize the comprehensive bridge
bridge = BiomniSSEBridge()

@app.get("/api/chat/intelligent")
async def biomni_sse_endpoint(
    message: str = Query(..., description="User query"),
    session_id: str = Query(..., description="Session ID"),
    model: str = Query("Sonnet-4", description="Model selection")
):
    """SSE endpoint that bridges Biomni agent to React frontend."""
    
    async def stream_biomni_to_react():
        """Stream Biomni responses to React frontend via SSE."""
        try:
            # Initialize Biomni agent
            from biomni.agent import A1
            
            data_path = os.getenv("BIOMNI_DATA_PATH", "/home/jayantlohia16/fresh-start/Biomni/data")
            agent = A1(path=data_path)
            
            # Reset bridge session
            bridge.reset_session()
            
            # Stream Biomni to React - FIXED: Handle sync generator properly
            print(f"🧬 Starting Biomni streaming for query: {message}")
            
            # Send initial events
            yield bridge.formatter.format_generic_event({
                'type': 'connected',
                'message': 'Connected to Biomni agent',
                'timestamp': datetime.now().isoformat()
            })
            
            yield bridge.formatter.format_event('model_info', {
                'model': model,
                'requested': 'auto',
                'timestamp': datetime.now().isoformat()
            })
            
            # Process Biomni stream synchronously
            try:
                for step in agent.go_stream(message):
                    print(f"🔄 Processing Biomni step: {type(step)}")
                    
                    # Transform each step to SSE events
                    react_events = bridge.transformer.transform_step(step)
                    print(f"📡 Generated {len(react_events)} SSE events")
                    
                    for event in react_events:
                        event_type = event['type']
                        event_data = event['data']
                        
                        sse_event = bridge.formatter.format_event(event_type, event_data)
                        print(f"📤 Sending {event_type} event")
                        yield sse_event
                        
                        # Small delay for real-time streaming
                        await asyncio.sleep(0.1)
                
                # Send completion event
                yield bridge.formatter.format_event('done', {
                    'message': 'Task completed successfully',
                    'timestamp': datetime.now().isoformat()
                })
                print(f"✅ Biomni streaming completed")
                
            except Exception as stream_error:
                print(f"❌ Biomni streaming error: {stream_error}")
                yield bridge.formatter.format_event('error', {
                    'content': f'Biomni streaming error: {str(stream_error)}',
                    'timestamp': datetime.now().isoformat()
                })
            
        except Exception as e:
            # Send error via bridge formatter
            error_event = bridge.formatter.format_event('error', {
                'content': f'Biomni bridge error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            })
            yield error_event
    
    return StreamingResponse(
        stream_biomni_to_react(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "biomni-sse-bridge", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    print("🚀 Starting Biomni SSE Bridge Server...")
    print("🔗 Bridging Biomni JSON objects to React SSE events")
    print("🌐 Server will run on: http://0.0.0.0:8000")
    print("📡 External access: http://35.223.254.208:8000")
    print("📊 Swagger docs: http://35.223.254.208:8000/docs")
    print("🩺 Health check: http://35.223.254.208:8000/health")
    print("📡 SSE endpoint: http://35.223.254.208:8000/api/chat/intelligent")
    print("🎯 Frontend expected on: http://35.223.254.208:3000")
    
    uvicorn.run(
        app,
        host="0.0.0.0",  # Bind to all interfaces for external access
        port=8000,       # Use port 8000 for production
        reload=False,
        log_level="info"
    )