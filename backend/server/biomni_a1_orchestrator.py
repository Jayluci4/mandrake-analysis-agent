"""
Biomni A1 Orchestrator with LLM Layer
This module adds an intelligent LLM layer to properly handle event streaming
"""

import json
import asyncio
import os
import sys
import re
from datetime import datetime
from typing import Dict, Any, AsyncGenerator, List, Optional, Tuple
from collections import deque
import time

# Fix Windows encoding
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8', errors='replace', line_buffering=True)

from dotenv import load_dotenv
load_dotenv()

class EventOrchestrator:
    """
    Intelligent event orchestrator that uses an LLM to properly parse and sequence events
    """
    
    def __init__(self):
        self.event_buffer = deque(maxlen=100)  # Buffer to hold recent events
        self.chunk_buffer = []  # Buffer to accumulate chunks
        self.last_event_type = None
        self.pending_tool_calls = {}  # Track tool calls waiting for outputs
        self.event_sequence = []
        
    def parse_chunk_with_llm(self, chunk: str) -> List[Dict[str, Any]]:
        """
        Use LLM logic to intelligently parse chunks into events
        """
        events = []
        
        # Clean the chunk
        chunk = chunk.strip()
        if not chunk:
            return events
        
        # Priority 0: Check for AI Message header FIRST (highest priority)
        if "================================== Ai Message ==================================" in chunk:
            # This is definitely an AI message - extract the content
            lines = chunk.split('\n')
            # Find where the actual message content starts (after the header)
            content_start = 0
            for i, line in enumerate(lines):
                if "Ai Message" in line:
                    content_start = i + 1
                    break
            
            # Get the message content (everything after the header)
            ai_content = '\n'.join(lines[content_start:]).strip()
            
            if ai_content:
                # Check if this AI message contains an observation
                if "<observation>" in ai_content and "</observation>" in ai_content:
                    # Extract the observation and send it as a separate event
                    obs_match = re.search(r'<observation>(.*?)</observation>', ai_content, re.DOTALL)
                    if obs_match:
                        observation_content = obs_match.group(1).strip()
                        # Send observation as its own event
                        events.append({
                            "type": "observation",
                            "content": observation_content,
                            "output": observation_content,
                            "timestamp": datetime.now().isoformat(),
                            "priority": "HIGH"
                        })
                        
                        # Check if there's any content before/after the observation
                        before = ai_content[:obs_match.start()].strip()
                        after = ai_content[obs_match.end():].strip()
                        
                        # If there's other content, send it as ai_message
                        if before or after:
                            remaining_content = (before + "\n" + after).strip()
                            if remaining_content:
                                events.append({
                                    "type": "ai_message",
                                    "content": remaining_content,
                                    "timestamp": datetime.now().isoformat(),
                                    "priority": "NORMAL"
                                })
                else:
                    # No observation, send as regular ai_message
                    events.append({
                        "type": "ai_message",
                        "content": ai_content,
                        "timestamp": datetime.now().isoformat(),
                        "priority": "HIGH"
                    })
                
                # Then parse the content for other events (like execute blocks)
                if "<execute>" in ai_content:
                    remaining_events = self.parse_chunk_with_llm(ai_content)
                    for evt in remaining_events:
                        if evt.get("type") not in ["ai_message", "observation"]:  # Avoid duplicates
                            events.append(evt)
                
                return events
            
        # Priority 1: Check for observation/output blocks (highest priority)
        if "<observation>" in chunk and "</observation>" in chunk:
            # This is an observation - MUST be sent immediately
            obs_match = re.search(r'<observation>(.*?)</observation>', chunk, re.DOTALL)
            if obs_match:
                output = obs_match.group(1).strip()
                events.append({
                    "type": "observation",  # Use observation type for frontend
                    "content": output,  # Frontend expects 'content' for observations
                    "output": output,  # Also include output for compatibility
                    "timestamp": datetime.now().isoformat(),
                    "priority": "HIGH"  # Mark as high priority
                })
                # Check if there's content before the observation
                before = chunk[:obs_match.start()].strip()
                if before:
                    events.extend(self.parse_chunk_with_llm(before))
                # Check if there's content after the observation
                after = chunk[obs_match.end():].strip()
                if after:
                    events.extend(self.parse_chunk_with_llm(after))
                return events
        
        # Priority 2: Check for execute blocks (tool calls)
        if "<execute>" in chunk and "</execute>" in chunk:
            code_match = re.search(r'<execute>(.*?)</execute>', chunk, re.DOTALL)
            if code_match:
                code = code_match.group(1).strip()
                tool_id = f"tool_{int(time.time()*1000)}"
                
                # Extract content before the execute block
                before_code = chunk[:code_match.start()].strip()
                
                # Check for todos/planning in the content before
                if before_code:
                    todos = self.extract_todos(before_code)
                    if todos:
                        events.append({
                            "type": "planning",
                            "steps": todos,
                            "timestamp": datetime.now().isoformat()
                        })
                    elif re.search(r'(?i)(thinking|plan|approach)', before_code):
                        events.append({
                            "type": "reasoning",
                            "content": before_code,
                            "timestamp": datetime.now().isoformat()
                        })
                
                # Add the tool call event
                events.append({
                    "type": "tool_call",
                    "tool_id": tool_id,
                    "tool_name": "execute_python",
                    "code": code,
                    "language": "python",
                    "timestamp": datetime.now().isoformat(),
                    "priority": "HIGH"
                })
                
                # Track this tool call as pending
                self.pending_tool_calls[tool_id] = True
                
                # Check for content after the execute block
                after = chunk[code_match.end():].strip()
                if after:
                    events.extend(self.parse_chunk_with_llm(after))
                    
                return events
        
        # Priority 3: Check for solution blocks (final answer)
        if "<solution>" in chunk and "</solution>" in chunk:
            sol_match = re.search(r'<solution>(.*?)</solution>', chunk, re.DOTALL)
            if sol_match:
                events.append({
                    "type": "final_answer",
                    "content": sol_match.group(1).strip(),
                    "timestamp": datetime.now().isoformat(),
                    "priority": "HIGH"
                })
                return events
        
        # Also check for final protocol/answer patterns without solution tags
        protocol_keywords = [
            "step-by-step protocol:",
            "experimental protocol:",
            "cloning protocol:",
            "final protocol:",
            "here is the complete protocol",
            "here's the step-by-step",
            "detailed experimental procedure:"
        ]
        
        if any(pattern in chunk.lower() for pattern in protocol_keywords):
            # Check if this looks like a final comprehensive answer
            lab_keywords = ["incubate", "ligate", "transform", "plate", "digest", "pcr", "amplif"]
            if len(chunk) > 300 and any(word in chunk.lower() for word in lab_keywords):
                events.append({
                    "type": "final_answer",
                    "content": chunk,
                    "timestamp": datetime.now().isoformat(),
                    "priority": "HIGH"
                })
                return events
        
        # Priority 4: Check for explicit todo/planning patterns
        todos = self.extract_todos(chunk)
        if todos:
            events.append({
                "type": "planning",
                "steps": todos,
                "timestamp": datetime.now().isoformat()
            })
            return events
        
        # Priority 5: Check for AI/Human message headers
        if "Ai Message" in chunk:
            # This is an AI response - parse it specially
            lines = chunk.split('\n')
            content = '\n'.join(lines[2:]) if len(lines) > 2 else ''
            if content.strip():
                # Always send the AI message as a distinct event
                events.append({
                    "type": "ai_message",
                    "content": content,
                    "timestamp": datetime.now().isoformat(),
                    "priority": "HIGH"  # Ensure it's sent immediately
                })
                
                # Then check if this contains a plan
                todos = self.extract_todos(content)
                if todos:
                    events.append({
                        "type": "planning", 
                        "steps": todos,
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Check for any execute blocks in the content
                if "<execute>" in content:
                    # Parse execute blocks separately
                    remaining_events = self.parse_chunk_with_llm(content)
                    # Filter out duplicate messages
                    for evt in remaining_events:
                        if evt.get("type") != "message":  # Avoid duplicate message events
                            events.append(evt)
                
                return events
            return events
        elif "Human Message" in chunk:
            # Human message - send as is
            lines = chunk.split('\n')
            content = '\n'.join(lines[2:]) if len(lines) > 2 else ''
            if content.strip():
                events.append({
                    "type": "human_message",
                    "content": content,
                    "timestamp": datetime.now().isoformat()
                })
            return events
        
        # Priority 6: Check for reasoning patterns
        if re.search(r'(?i)(thinking|analyzing|planning|approach|need to|will|should)', chunk):
            events.append({
                "type": "reasoning",
                "content": chunk,
                "timestamp": datetime.now().isoformat()
            })
            return events
        
        # Default: treat as message
        if chunk and not chunk.startswith('='):
            events.append({
                "type": "message",
                "content": chunk,
                "timestamp": datetime.now().isoformat()
            })
        
        return events
    
    def extract_todos(self, content: str) -> List[Dict[str, str]]:
        """Extract todo items from content"""
        todos = []
        
        # Pattern for numbered todo items with checkboxes
        patterns = [
            r'^\s*\d+\.\s*\[([^\]]*)\]\s*(.+?)(?:\.|$)',
            r'^\s*[-*+]\s*\[([^\]]*)\]\s*(.+?)(?:\.|$)',
            r'^\s*\[([^\]]*)\]\s*(.+?)(?:\.|$)',
        ]
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            for pattern in patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    checkbox = match.group(1).strip() if len(match.groups()) >= 1 else ""
                    task = match.group(2).strip() if len(match.groups()) >= 2 else line
                    
                    # Determine status
                    if checkbox in ['✓', '✔', 'x', 'X', 'done']:
                        status = 'completed'
                    elif checkbox in ['✗', '✕', '✖', 'failed']:
                        status = 'failed'
                    else:
                        status = 'pending'
                    
                    todos.append({'step': task, 'status': status})
                    break
        
        return todos
    
    async def process_chunk_stream(self, chunk: str) -> AsyncGenerator[dict, None]:
        """
        Process a chunk and yield properly formatted events
        """
        # Add chunk to buffer for context
        self.chunk_buffer.append(chunk)
        
        # Parse the chunk into events
        events = self.parse_chunk_with_llm(chunk)
        
        # Process and yield events in order
        for event in events:
            # Check priority - high priority events go immediately
            if event.get("priority") == "HIGH":
                yield event
                # Small delay to ensure order
                await asyncio.sleep(0.01)
            else:
                # Regular events - check for duplicates
                if event["type"] != self.last_event_type or event["type"] in ["tool_call", "tool_output", "planning"]:
                    yield event
                    self.last_event_type = event["type"]
                    await asyncio.sleep(0.01)
    
    def ensure_event_completion(self) -> List[Dict[str, Any]]:
        """
        Check if there are pending tool calls without outputs and generate placeholder events
        """
        completion_events = []
        
        for tool_id in list(self.pending_tool_calls.keys()):
            if self.pending_tool_calls[tool_id]:
                # Generate a placeholder output event
                completion_events.append({
                    "type": "tool_output",
                    "tool_id": tool_id,
                    "output": "Processing...",
                    "timestamp": datetime.now().isoformat(),
                    "placeholder": True
                })
                del self.pending_tool_calls[tool_id]
        
        return completion_events


class SmartEventProcessor:
    """
    Smart event processor that ensures all events are properly sent to frontend
    """
    
    def __init__(self):
        self.orchestrator = EventOrchestrator()
        self.event_history = deque(maxlen=50)
        self.last_sent_time = time.time()
        self.pending_tool_calls = {}  # Track when tool calls were sent
        self.tool_timeout = 600.0  # Timeout for tool execution
        
    async def process_agent_output(self, content: str) -> AsyncGenerator[dict, None]:
        """
        Process agent output and yield well-formed events
        """
        # Skip empty content
        if not content or not content.strip():
            return
            
        # Process through orchestrator
        async for event in self.orchestrator.process_chunk_stream(content):
            # Track event history
            self.event_history.append(event)
            
            # Track tool calls
            if event.get("type") == "tool_call":
                tool_id = event.get("tool_id", f"tool_{int(time.time()*1000)}")
                self.pending_tool_calls[tool_id] = time.time()
                event["tool_id"] = tool_id  # Ensure tool_id is set
            
            # Clear pending tool call if we get output or observation
            elif event.get("type") in ["tool_output", "observation"]:
                tool_id = event.get("tool_id")
                if tool_id and tool_id in self.pending_tool_calls:
                    del self.pending_tool_calls[tool_id]
            
            # Update last sent time
            self.last_sent_time = time.time()
            
            # Yield the event
            yield event
    
    async def check_pending_events(self) -> AsyncGenerator[dict, None]:
        """
        Check for pending events that need completion
        """
        current_time = time.time()
        
        # Check for timed-out tool calls
        for tool_id, sent_time in list(self.pending_tool_calls.items()):
            if current_time - sent_time > self.tool_timeout:
                # Generate a timeout observation event
                timeout_event = {
                    "type": "observation",
                    "tool_id": tool_id,
                    "content": "⏱️ Tool execution timed out after 30 seconds. The operation is taking longer than expected. Continuing with alternative approach...",
                    "output": "Tool execution timed out. Continuing...",
                    "timestamp": datetime.now().isoformat(),
                    "timeout": True
                }
                yield timeout_event
                self.event_history.append(timeout_event)
                del self.pending_tool_calls[tool_id]
        
        # Also check orchestrator's pending events
        if time.time() - self.last_sent_time > 2.0:
            completion_events = self.orchestrator.ensure_event_completion()
            for event in completion_events:
                yield event
                self.event_history.append(event)


# Enhanced streaming function using the orchestrator
async def stream_with_orchestrator(agent, message: str) -> AsyncGenerator[dict, None]:
    """
    Stream agent responses with intelligent orchestration
    """
    processor = SmartEventProcessor()
    
    try:
        # Start agent streaming
        for output in agent.go_stream(message):
            if output and 'output' in output:
                content = output['output']
                
                # Process through smart processor
                async for event in processor.process_agent_output(content):
                    yield event
        
        # Check for any pending events
        async for event in processor.check_pending_events():
            yield event
        
        # Send completion event
        yield {
            "type": "done",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        yield {
            "type": "error",
            "content": str(e),
            "timestamp": datetime.now().isoformat()
        }


# Test the orchestrator
if __name__ == "__main__":
    import asyncio
    
    # Test chunks that were causing issues
    test_chunks = [
        "================================== Ai Message ==================================\n\nThank you for your feedback.",
        """<execute>
from biomni.tool.molecular_biology import get_gene_coding_sequence

result = get_gene_coding_sequence(gene_name="PAH", organism="Homo sapiens")
print(result)
</execute>""",
        "<observation>Error: Connection timeout</observation>",
        """Plan:
1. [ ] Get gene sequence
2. [ ] Find mutation
3. [x] Show result""",
    ]
    
    async def test():
        orchestrator = EventOrchestrator()
        
        for chunk in test_chunks:
            print(f"\n--- Processing chunk ---")
            print(chunk[:50] + "..." if len(chunk) > 50 else chunk)
            
            events = orchestrator.parse_chunk_with_llm(chunk)
            for event in events:
                print(f"Event: {event['type']}")
                if event['type'] == 'tool_call':
                    print(f"  Tool: {event.get('tool_name')}")
                elif event['type'] == 'planning':
                    print(f"  Steps: {len(event.get('steps', []))}")
    
    asyncio.run(test())