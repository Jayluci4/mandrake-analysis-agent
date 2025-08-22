"""
Biomni A1 Advanced Server V4 - Enhanced Parsing and Display
Fixes:
1. Better reasoning detection
2. Improved todo/planning parsing
3. Fixed encoding issues
4. Better event streaming
"""

import json
import asyncio
import os
import sys
import re
import base64
from datetime import datetime
from typing import Dict, Any, AsyncGenerator, List, Optional
from dotenv import load_dotenv
import logging
import threading
import queue as queue_module
from biomni_a1_orchestrator import SmartEventProcessor

# Fix Windows encoding - MUST be done before any imports that might print
if sys.platform.startswith('win'):
    import codecs
    import io
    # Set UTF-8 encoding for stdout and stderr
    sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8', errors='replace', line_buffering=True)
    # Set console code page to UTF-8
    try:
        import subprocess
        subprocess.run('chcp 65001', shell=True, capture_output=True, check=False)
    except:
        pass

# Configure logging after fixing encoding - use print instead to avoid buffer conflicts
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

class SimpleLogger:
    def info(self, msg):
        print(f"[INFO] {msg}")
    def warning(self, msg):
        print(f"[WARN] {msg}")
    def error(self, msg):
        print(f"[ERROR] {msg}")
    def debug(self, msg):
        print(f"[DEBUG] {msg}")

logger = SimpleLogger()

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Biomni A1 Advanced API", version="4.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent = None
agent_initialized = False

def initialize_agent():
    """Initialize the A1 agent with proper configuration"""
    global agent, agent_initialized
    
    if agent_initialized:
        return agent
    
    # Configure matplotlib for non-interactive backend BEFORE importing A1
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    plt.ioff()  # Turn off interactive mode
    
    try:
        from biomni.agent import A1
        
        # Try different LLM configurations
        llm_configs = [
            # First try Azure GPT-4.1 if configured
            ("azure-gpt-4.1", None, os.getenv("AZURE_OPENAI_API_KEY")),
            # Then try OpenAI if API key exists
            ("gpt-4", None, os.getenv("OPENAI_API_KEY")),
            # Try DeepSeek if available
            ("deepseek-reasoner", None, os.getenv("DEEPSEEK_API_KEY"))
        ]
        
        for llm_name, base_url, api_key in llm_configs:
            try:
                # Skip if no API key for non-mock modes
                if llm_name != "mock" and not api_key:
                    logger.info(f"Skipping {llm_name} - no API key found")
                    continue
                    
                logger.info(f"Trying to initialize A1 with {llm_name}...")
                agent = A1(
                    path="./data",
                    llm=llm_name,
                    timeout_seconds=600,
                    use_tool_retriever=True,
                    api_key=api_key if api_key else "EMPTY"
                )
                
                # Inject matplotlib configuration into the agent's Python execution environment
                try:
                    from biomni.tool.support_tools import _persistent_namespace
                    # Pre-configure matplotlib in the agent's namespace
                    exec("""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.ioff()
# Override plt.show() to be a no-op to prevent blocking
_original_show = plt.show
def _non_blocking_show(*args, **kwargs):
    pass  # Do nothing instead of showing
plt.show = _non_blocking_show
print("Matplotlib configured for non-interactive mode")
""", _persistent_namespace)
                    logger.info("Injected matplotlib configuration into agent's Python environment")
                    
                    # Import and apply comprehensive BioPython fix
                    try:
                        from fix_biopython_imports import ensure_biopython_in_agent
                        ensure_biopython_in_agent(agent)
                        logger.info("Applied comprehensive BioPython fix")
                    except Exception as fix_error:
                        logger.warning(f"Could not apply BioPython fix: {fix_error}")
                        # Fallback to direct injection
                        exec(open('fix_biopython_imports.py', encoding='utf-8').read().split('def ensure_biopython_in_agent')[0], _persistent_namespace)
                        logger.info("Injected BioPython fallback directly")
                    
                except Exception as e:
                    logger.warning(f"Could not inject config into agent environment: {e}")
                
                # Apply molecular biology function patches
                try:
                    exec(open('patch_molecular_biology.py', encoding='utf-8').read())
                except Exception as e:
                    logger.warning(f"Could not load patch_molecular_biology.py: {e}")
                
                # Pre-execute BioPython initialization to ensure it's available
                try:
                    init_code = """
# Pre-initialize BioPython classes
try:
    from Bio.Seq import Seq
    print("Bio.Seq already available")
except:
    # Use fallback
    exec(open('fix_biopython_imports.py', encoding='utf-8').read().split('biopython_init_code = """')[1].split('"""')[0])
    print("Initialized BioPython fallback")
"""
                    if hasattr(agent, 'run_python_repl'):
                        result = agent.run_python_repl(init_code)
                        logger.info(f"Pre-initialization result: {result}")
                except Exception as e:
                    logger.warning(f"Could not pre-initialize BioPython: {e}")
                
                # Apply enhanced tool fixes including sgRNA library support
                try:
                    # Load the fixes module properly
                    import sys
                    import importlib.util
                    spec = importlib.util.spec_from_file_location("biomni_tool_fixes", "biomni_tool_fixes.py")
                    biomni_tool_fixes = importlib.util.module_from_spec(spec)
                    sys.modules["biomni_tool_fixes"] = biomni_tool_fixes
                    spec.loader.exec_module(biomni_tool_fixes)
                    
                    # Now register the tools
                    biomni_tool_fixes.register_enhanced_tools(agent)
                    logger.info("[TOOLS] Successfully registered enhanced molecular biology tools")
                    
                    # Also register all biomni tools directly
                    spec2 = importlib.util.spec_from_file_location("register_biomni_tools", "register_biomni_tools.py")
                    register_biomni_tools = importlib.util.module_from_spec(spec2)
                    sys.modules["register_biomni_tools"] = register_biomni_tools
                    spec2.loader.exec_module(register_biomni_tools)
                    
                    register_biomni_tools.register_all_biomni_tools(agent)
                    register_biomni_tools.ensure_solution_generation(agent)
                    logger.info("[TOOLS] Registered all biomni tools and solution generation")
                    
                except Exception as e:
                    logger.warning(f"Could not load enhanced tools: {e}")
                
                agent_initialized = True
                logger.info(f"[SUCCESS] A1 agent initialized successfully with {llm_name}")
                return agent
            except Exception as e:
                logger.error(f"Failed with {llm_name}: {e}")
                continue
        
        logger.warning("Could not initialize A1 with any LLM")
        agent_initialized = True
        
    except ImportError as e:
        logger.error(f"Error importing A1 agent: {e}")
        agent_initialized = True
    
    return agent

def extract_todos_from_content(content: str) -> List[Dict[str, str]]:
    """Extract todo/planning items from content with various formats"""
    todos = []
    
    # Debug logging to see what we're parsing
    logger.debug(f"Extracting todos from content: {content[:200]}...")
    
    # Pattern 1: Numbered lists with checkboxes - MORE FLEXIBLE
    # Examples: "1. [ ] Task", "2. [x] Done", "3. [✓] Complete" 
    pattern1 = r'^\s*\d+\.\s*\[([^\]]*)\]\s*(.+?)(?:\.|$)'
    
    # Pattern 2: Bullet points with checkboxes  
    # Examples: "- [ ] Task", "* [x] Done", "+ [✓] Complete"
    pattern2 = r'^\s*[-*+]\s*\[([^\]]*)\]\s*(.+?)(?:\.|$)'
    
    # Pattern 3: Simple checkboxes
    # Examples: "[ ] Task", "[x] Done", "[✓] Complete"
    pattern3 = r'^\s*\[([^\]]*)\]\s*(.+?)(?:\.|$)'
    
    # Pattern 4: Step-based format
    # Examples: "Step 1: Task", "Step 2: Done"
    pattern4 = r'^\s*[Ss]tep\s+\d+[:.]?\s*(.+?)(?:\.|$)'
    
    # Pattern 5: Plain numbered lists after finding checklist header
    # Examples: "1. Task", "2. Another task"
    pattern5 = r'^\s*\d+\.\s+([^[].+?)(?:\.|$)'
    
    lines = content.split('\n')
    found_checklist_header = False
    
    # Check if we have a checklist header
    for line in lines:
        if re.search(r'(?i)(checklist|plan|steps|todo):', line):
            found_checklist_header = True
            logger.debug(f"Found checklist header in line: {line}")
            break
    
    for line_num, line in enumerate(lines):
        original_line = line
        line = line.strip()
        if not line:
            continue
        
        logger.debug(f"Processing line {line_num}: '{line}'")
        
        # Try checkbox patterns first (highest priority)
        for pattern_num, pattern in enumerate([pattern1, pattern2, pattern3], 1):
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                checkbox = match.group(1).strip() if len(match.groups()) >= 1 else ""
                task = match.group(2).strip() if len(match.groups()) >= 2 else line
                
                # Clean up the task text
                task = re.sub(r'\.$', '', task)  # Remove trailing period
                task = task.strip()
                
                # Determine status based on checkbox content
                if checkbox in ['✓', '✔', 'x', 'X', 'v', 'V', '✗', '✕', 'done', 'complete']:
                    status = 'completed'
                elif checkbox in ['-', '>', '→', 'doing', 'progress', 'working']:
                    status = 'in_progress'
                elif checkbox in ['✗', '✕', '✖', 'failed', 'error', 'skip']:
                    status = 'failed'
                else:
                    status = 'pending'
                
                logger.debug(f"Pattern {pattern_num} matched: checkbox='{checkbox}', task='{task}', status='{status}'")
                todos.append({'step': task, 'status': status})
                break
        else:
            # Try step pattern
            match = re.match(pattern4, line, re.IGNORECASE)
            if match:
                task = match.group(1).strip()
                task = re.sub(r'\.$', '', task)  # Remove trailing period
                logger.debug(f"Step pattern matched: task='{task}'")
                todos.append({'step': task, 'status': 'pending'})
            elif found_checklist_header:
                # If we found a checklist header, try plain numbered lists
                match = re.match(pattern5, line)
                if match:
                    task = match.group(1).strip()
                    task = re.sub(r'\.$', '', task)  # Remove trailing period
                    logger.debug(f"Numbered list pattern matched: task='{task}'")
                    todos.append({'step': task, 'status': 'pending'})
    
    logger.debug(f"Extracted {len(todos)} todos: {todos}")
    return todos

def split_content_into_events(content: str) -> List[dict]:
    """Split content that contains multiple event types into separate events"""
    events = []
    
    # Split content by major sections
    sections = []
    
    # Look for clear section breaks like headers
    section_patterns = [
        r'(?i)\*\*thinking process:?\*\*',
        r'(?i)\*\*checklist:?\*\*',
        r'(?i)\*\*plan:?\*\*',
        r'(?i)\*\*steps:?\*\*',
        r'(?i)\*\*next step:?\*\*',
    ]
    
    current_pos = 0
    section_matches = []
    
    # Find all section headers
    for pattern in section_patterns:
        for match in re.finditer(pattern, content):
            section_matches.append((match.start(), match.end(), match.group(0), pattern))
    
    # Sort by position
    section_matches.sort(key=lambda x: x[0])
    
    if section_matches:
        # Extract sections based on headers
        for i, (start, end, header, pattern) in enumerate(section_matches):
            # Get content before this header if it's not the first
            if i == 0 and start > 0:
                before_content = content[:start].strip()
                if before_content:
                    sections.append(("reasoning", before_content))
            
            # Get content for this section (until next header or end)
            next_start = section_matches[i + 1][0] if i + 1 < len(section_matches) else len(content)
            section_content = content[start:next_start].strip()
            
            # Determine section type based on header
            if re.search(r'(?i)(checklist|plan|steps)', pattern):
                sections.append(("planning", section_content))
            else:
                sections.append(("reasoning", section_content))
        
        # Process any remaining content
        last_end = section_matches[-1][0] + len(section_matches[-1][2])
        if last_end < len(content):
            remaining = content[last_end:].strip()
            if remaining:
                sections.append(("reasoning", remaining))
    else:
        # No clear sections found, use original logic
        sections.append(("auto", content))
    
    # Convert sections to events
    for section_type, section_content in sections:
        if section_type == "planning":
            todos = extract_todos_from_content(section_content)
            if todos:
                events.append({
                    "type": "planning",
                    "steps": todos,
                    "full_content": section_content,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                events.append({
                    "type": "reasoning",
                    "content": section_content,
                    "timestamp": datetime.now().isoformat()
                })
        elif section_type == "reasoning":
            events.append({
                "type": "reasoning", 
                "content": section_content,
                "timestamp": datetime.now().isoformat()
            })
        else:  # auto
            # Use original parsing logic
            event = parse_single_content(section_content)
            events.append(event)
    
    return events

def parse_single_content(content: str) -> dict:
    """Parse a single piece of content (original logic extracted)"""
    
    # Extract todos regardless, but prioritize if header found
    todos = extract_todos_from_content(content)
    
    # Check for explicit planning headers
    planning_headers = [
        r'(?i)\*\*checklist:?\*\*',
        r'(?i)\*\*plan:?\*\*', 
        r'(?i)\*\*steps:?\*\*',
        r'(?i)\*\*todo:?\*\*',
        r'(?i)checklist:?',
        r'(?i)plan:?',
        r'(?i)steps to follow:?',
        r'(?i)next steps:?',
    ]
    
    has_planning_header = False
    for header_pattern in planning_headers:
        if re.search(header_pattern, content):
            has_planning_header = True
            break
    
    # If we have clear planning indicators OR found todos, treat as planning
    if has_planning_header or todos:
        logger.info(f"Found planning content: header={has_planning_header}, todos_count={len(todos)}")
        return {
            "type": "planning",
            "steps": todos if todos else [{"step": "Planning in progress...", "status": "pending"}],
            "full_content": content,
            "timestamp": datetime.now().isoformat()
        }
    
    # Check for reasoning patterns
    reasoning_indicators = [
        r'(?i)(I need to|Let me|I\'ll|I will|I should|I must|I can)',
        r'(?i)(thinking|analyzing|considering|evaluating|assessing)',
        r'(?i)(First,|Next,|Then,|Finally,|Step \d+)',
        r'(?i)(processing|understanding|examining|investigating)',
        r'(?i)(planning|searching|looking for|trying to)',
    ]
    
    is_reasoning = False
    for pattern in reasoning_indicators:
        if re.search(pattern, content):
            is_reasoning = True
            break
    
    if is_reasoning:
        return {
            "type": "reasoning",
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
    
    # Default to message
    return {
        "type": "message",
        "content": content,
        "timestamp": datetime.now().isoformat()
    }

def extract_visualizations_from_content(content: str) -> List[Dict[str, str]]:
    """Extract visualization file references from content and convert to base64"""
    visualizations = []
    
    logger.debug(f"Extracting visualizations from content (first 100 chars): {content[:100]}")
    
    # Common patterns for visualization file references
    viz_patterns = [
        r'(?i)(?:plot|chart|graph|figure|image|visualization).*?saved (?:to|as):?\s*([^\s\n\'\"]+\.(?:png|jpg|jpeg|svg|pdf))',
        r'(?i)saved (?:plot|chart|graph|figure|image|visualization):?\s*([^\s\n\'\"]+\.(?:png|jpg|jpeg|svg|pdf))',
        r'(?i)(?:saved|created|generated).*?(?:plot|chart|graph|figure|image|visualization).*?:?\s*([^\s\n\'\"]+\.(?:png|jpg|jpeg|svg|pdf))',
        r'([^\s\n\'\"]+\.(?:png|jpg|jpeg|svg|pdf)).*?(?:created|saved|generated)',
        r'(?i)(?:file|output).*?saved.*?:?\s*([^\s\n\'\"]+\.(?:png|jpg|jpeg|svg|pdf))',
        r"'([^']+\.(?:png|jpg|jpeg|svg|pdf))'",  # Files in single quotes
        r'"([^"]+\.(?:png|jpg|jpeg|svg|pdf))"',  # Files in double quotes
        r'(?i)scatter plot saved as\s+([^\s\n]+\.(?:png|jpg|jpeg|svg|pdf))',  # Specific pattern for scatter plot
    ]
    
    found_files = set()  # Track unique files
    
    for i, pattern in enumerate(viz_patterns):
        matches = list(re.finditer(pattern, content))
        if matches:
            logger.debug(f"Pattern {i+1} matched {len(matches)} time(s)")
        for match in matches:
            filepath = match.group(1).strip()
            logger.debug(f"Matched filepath: '{filepath}'")
            # Clean up the filepath
            filepath = re.sub(r'^["\']|["\']$', '', filepath)  # Remove quotes
            filepath = filepath.rstrip('.,;:!')  # Remove trailing punctuation
            
            # Skip if already processed
            if filepath in found_files:
                continue
                
            # Check multiple possible locations for the file
            possible_paths = [
                filepath,  # Original path
                os.path.join('.', filepath),  # Current directory
                os.path.join('data', filepath),  # Data directory
                os.path.join('./data', filepath),  # Data directory
                os.path.abspath(filepath),  # Absolute path
            ]
            
            file_found = False
            for check_path in possible_paths:
                if os.path.exists(check_path):
                    file_found = True
                    filepath = check_path
                    break
            
            if file_found:
                found_files.add(filepath)
                try:
                    # Convert to base64
                    with open(filepath, 'rb') as f:
                        img_data = f.read()
                        img_base64 = base64.b64encode(img_data).decode('utf-8')
                        format = os.path.basename(filepath).split('.')[-1].lower()
                        visualizations.append({
                            'path': filepath,
                            'type': 'image',
                            'format': format,
                            'description': f'Visualization: {os.path.basename(filepath)}',
                            'data': f"data:image/{format};base64,{img_base64}"
                        })
                        logger.info(f"Found and encoded visualization file: {filepath}")
                except Exception as e:
                    logger.error(f"Failed to encode visualization {filepath}: {e}")
            else:
                # Even if file not found, create a placeholder visualization event
                # This ensures the frontend knows a visualization was attempted
                logger.warning(f"Visualization file not found at any location: {filepath}")
                if filepath.endswith(('.png', '.jpg', '.jpeg', '.svg', '.pdf')):
                    format = filepath.split('.')[-1].lower()
                    visualizations.append({
                        'path': filepath,
                        'type': 'image',
                        'format': format,
                        'description': f'Visualization (pending): {os.path.basename(filepath)}',
                        'data': f"data:image/svg+xml;base64,{base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" text-anchor="middle" fill="#999">Visualization file not found: ' + filepath.encode() + b'</text></svg>').decode()}"
                    })
    
    return visualizations

def parse_agent_output_enhanced(content: str) -> dict:
    """Enhanced parser for agent output with better pattern matching and visualization support"""
    
    # Clean the content but preserve structure
    content = content.strip()
    
    # Remove excessive equals signs but keep the content
    content = re.sub(r'={10,}', '', content)
    
    # Priority 1: Check for structured XML-like tags
    
    # Check for solution blocks (final answer)
    if "<solution>" in content and "</solution>" in content:
        match = re.search(r'<solution>(.*?)</solution>', content, re.DOTALL)
        if match:
            return {
                "type": "final_answer",
                "content": match.group(1).strip(),
                "timestamp": datetime.now().isoformat()
            }
    
    # Check for execute blocks (code execution)
    if "<execute>" in content and "</execute>" in content:
        code_match = re.search(r'<execute>(.*?)</execute>', content, re.DOTALL)
        if code_match:
            code = code_match.group(1).strip()
            # Extract reasoning before the code
            before_code = content[:code_match.start()].strip()
            
            # Try to extract language from execute tag attributes or guess from content
            language = "python"  # default
            if "```r" in code.lower() or "library(" in code:
                language = "r"
            elif "```bash" in code.lower() or "#!/bin/bash" in code:
                language = "bash"
            elif "```sql" in code.lower():
                language = "sql"
            
            # Check if the reasoning before the code contains todos
            todos_from_reasoning = []
            if before_code:
                todos_from_reasoning = extract_todos_from_content(before_code)
            
            result = {
                "type": "tool_call",
                "tool_name": f"execute_{language}",
                "code": code,
                "language": language,
                "reasoning": before_code if before_code else None,
                "timestamp": datetime.now().isoformat()
            }
            
            # If we found todos in the reasoning, mark this as mixed content
            if todos_from_reasoning:
                logger.info(f"Found {len(todos_from_reasoning)} todos in tool_call reasoning")
                return {
                    "type": "mixed_content",
                    "events": [
                        {
                            "type": "planning",
                            "steps": todos_from_reasoning,
                            "full_content": before_code,
                            "timestamp": datetime.now().isoformat()
                        },
                        result
                    ],
                    "timestamp": datetime.now().isoformat()
                }
            
            return result
    
    # Check for observation blocks (results)
    if "<observation>" in content and "</observation>" in content:
        obs_match = re.search(r'<observation>(.*?)</observation>', content, re.DOTALL)
        if obs_match:
            return {
                "type": "tool_output",
                "output": obs_match.group(1).strip(),
                "timestamp": datetime.now().isoformat()
            }
    
    # Priority 2: Check if content has multiple sections that should be split
    # Look for section headers that indicate mixed content
    mixed_content_indicators = [
        r'(?i)\*\*thinking process:?\*\*.*?\*\*checklist:?\*\*',
        r'(?i)\*\*checklist:?\*\*.*?\*\*next step:?\*\*',
    ]
    
    has_mixed_content = False
    for pattern in mixed_content_indicators:
        if re.search(pattern, content, re.DOTALL):
            has_mixed_content = True
            break
    
    if has_mixed_content:
        logger.info("Content has multiple sections, splitting...")
        events = split_content_into_events(content)
        # Return all events as mixed content
        if len(events) > 1:
            return {
                "type": "mixed_content",
                "events": events,
                "timestamp": datetime.now().isoformat()
            }
        elif events:
            return events[0]
    
    # Priority 3: Check for visualizations in the content
    visualizations = extract_visualizations_from_content(content)
    if visualizations:
        # If we have visualizations, create a visualization event
        base_event = parse_single_content(content)
        
        # Convert visualizations to base64 for embedding
        embedded_visualizations = []
        for viz in visualizations:
            try:
                with open(viz['path'], 'rb') as f:
                    img_data = f.read()
                    img_base64 = base64.b64encode(img_data).decode('utf-8')
                    embedded_visualizations.append({
                        'path': viz['path'],
                        'type': viz['type'],
                        'format': viz['format'],
                        'description': viz['description'],
                        'data': f"data:image/{viz['format']};base64,{img_base64}"
                    })
            except Exception as e:
                logger.error(f"Failed to encode visualization {viz['path']}: {e}")
                continue
        
        if embedded_visualizations:
            # Return mixed content with visualization event
            return {
                "type": "mixed_content",
                "events": [
                    base_event,
                    {
                        "type": "visualization",
                        "content": embedded_visualizations,  # Frontend expects 'content' not 'images'
                        "images": embedded_visualizations,  # Keep for backward compatibility
                        "timestamp": datetime.now().isoformat()
                    }
                ],
                "timestamp": datetime.now().isoformat()
            }
    
    # Priority 4: Single content parsing
    return parse_single_content(content)

async def stream_a1_events_v4_old(message: str) -> AsyncGenerator[dict, None]:
    """Enhanced streaming with better parsing and error handling"""
    
    agent = initialize_agent()
    
    if not agent:
        yield {
            "type": "error",
            "content": "Agent initialization failed. Please check your API keys.",
            "timestamp": datetime.now().isoformat()
        }
        return
    
    try:
        logger.info(f"Processing message: {message[:100]}...")
        
        # Track accumulated content for better context
        accumulated_content = ""
        last_event_type = None
        
        # Create event queue for thread-safe communication
        import queue
        import threading
        
        event_queue = queue.Queue()
        error_occurred = threading.Event()
        
        def run_agent_streaming():
            """Run agent in thread with enhanced error handling"""
            try:
                chunk_count = 0
                for output in agent.go_stream(message):
                    if output and 'output' in output:
                        content = output['output']
                        chunk_count += 1
                        
                        # Safe encoding for logging
                        try:
                            if isinstance(content, str):
                                # Clean up the content
                                content = content.replace('\r\n', '\n').replace('\r', '\n')
                                logger.debug(f"Agent chunk {chunk_count} (length: {len(content)}): {content[:100]}...")
                                event_queue.put(('content', content))
                                logger.debug(f"Put chunk {chunk_count} in queue, queue size: {event_queue.qsize()}")
                        except Exception as e:
                            logger.error(f"Encoding error: {e}")
                            event_queue.put(('error', str(e)))
                
                # Signal completion
                event_queue.put(('done', None))
                
            except Exception as e:
                logger.error(f"Agent streaming error: {e}", exc_info=True)
                error_occurred.set()
                event_queue.put(('error', str(e)))
        
        # Start agent in background thread
        thread = threading.Thread(target=run_agent_streaming, daemon=True)
        thread.start()
        
        # Process events from queue
        loop = asyncio.get_event_loop()
        
        while True:
            try:
                # Get event with timeout - but check if queue has items first
                logger.debug(f"Checking queue, current size: {event_queue.qsize()}")
                event_type, content = await loop.run_in_executor(
                    None, 
                    lambda: event_queue.get(timeout=1.0)
                )
                logger.debug(f"Got event from queue: {event_type}, content length: {len(content) if event_type == 'content' else 'N/A'}")
                
                if event_type == 'done':
                    # Send final done event
                    yield {
                        "type": "done",
                        "timestamp": datetime.now().isoformat()
                    }
                    break
                    
                elif event_type == 'error':
                    yield {
                        "type": "error",
                        "content": content,
                        "timestamp": datetime.now().isoformat()
                    }
                    break
                    
                elif event_type == 'content':
                    # Accumulate content for better context
                    accumulated_content += content + "\n"
                    logger.info(f"Processing content from queue (length: {len(content)})")
                    
                    try:
                        # Parse the new content - now handles multiple events
                        logger.info(f"Starting to parse content chunk...")
                        parsed_result = parse_agent_output_enhanced(content)
                        logger.info(f"Parsed result type: {parsed_result.get('type', 'NONE')}")
                    except Exception as parse_error:
                        logger.error(f"Failed to parse content: {parse_error}")
                        logger.error(f"Content that failed: {content[:200]}...")
                        # Send as raw message if parsing fails
                        parsed_result = {
                            "type": "message",
                            "content": content,
                            "timestamp": datetime.now().isoformat()
                        }
                    
                    # Special handling for tool_output that might contain visualizations
                    if parsed_result.get("type") == "tool_output":
                        output_text = parsed_result.get("output", "")
                        logger.debug(f"Checking tool_output for visualizations: {output_text[:200]}...")
                        # Check if the output mentions saved visualizations
                        visualizations = extract_visualizations_from_content(output_text)
                        if visualizations:
                            logger.info(f"Found {len(visualizations)} visualization(s) in tool_output!")
                            # Convert to mixed content with visualization event
                            parsed_result = {
                                "type": "mixed_content",
                                "events": [
                                    parsed_result,  # Original tool_output
                                    {
                                        "type": "visualization",
                                        "content": visualizations,  # Frontend expects 'content' not 'images'
                                        "images": visualizations,  # Keep for backward compatibility
                                        "timestamp": datetime.now().isoformat()
                                    }
                                ],
                                "timestamp": datetime.now().isoformat()
                            }
                        else:
                            logger.debug("No visualizations found in tool_output")
                    
                    # Check if this is mixed content that was split
                    if parsed_result.get("type") == "mixed_content":
                        # Handle multiple events
                        for event in parsed_result.get("events", []):
                            logger.info(f"Yielding mixed event: {event['type']}")
                            yield event
                            # No sleep - let the event loop handle scheduling
                    else:
                        # Single event - always yield ALL events to ensure frontend stays in sync
                        logger.info(f"Yielding single event: {parsed_result['type']}")
                        yield parsed_result
                        # No sleep - let the event loop handle scheduling
                    
            except queue.Empty:
                # Check if thread is still alive
                if not thread.is_alive():
                    if not error_occurred.is_set():
                        yield {
                            "type": "done",
                            "timestamp": datetime.now().isoformat()
                        }
                    break
                # Continue waiting
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Queue processing error: {e}")
                yield {
                    "type": "error",
                    "content": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                break
        
    except Exception as e:
        logger.error(f"Stream error: {e}", exc_info=True)
        yield {
            "type": "error",
            "content": str(e),
            "timestamp": datetime.now().isoformat()
        }

async def stream_a1_events_v4(message: str) -> AsyncGenerator[dict, None]:
    """Enhanced streaming with LLM orchestration for reliable event delivery"""
    
    agent = initialize_agent()
    
    if not agent:
        yield {
            "type": "error",
            "content": "Agent initialization failed. Please check your API keys.",
            "timestamp": datetime.now().isoformat()
        }
        return
    
    try:
        logger.info(f"Processing message with orchestrator: {message[:100]}...")
        
        # Use the smart event processor
        processor = SmartEventProcessor()
        
        # Run agent streaming in a background task
        output_queue = queue_module.Queue()
        streaming_done = threading.Event()
        
        def stream_agent():
            try:
                for output in agent.go_stream(message):
                    if output and 'output' in output:
                        output_queue.put(('content', output['output']))
                output_queue.put(('done', None))
            except Exception as e:
                output_queue.put(('error', str(e)))
            finally:
                streaming_done.set()
        
        # Start agent streaming in background
        thread = threading.Thread(target=stream_agent, daemon=True)
        thread.start()
        
        # Process events with timeout checking
        while True:
            # Check for new agent output (non-blocking)
            try:
                event_type, content = output_queue.get_nowait()
                
                if event_type == 'done':
                    break
                elif event_type == 'error':
                    yield {
                        "type": "error",
                        "content": content,
                        "timestamp": datetime.now().isoformat()
                    }
                    break
                elif event_type == 'content':
                    # Process through orchestrator
                    async for event in processor.process_agent_output(content):
                        # logger.debug(f"Orchestrator yielding event: {event.get('type')}")
                        yield event
            except queue_module.Empty:
                # No new output, check for timeouts
                pass
            
            # Always check for pending/timed-out events
            async for event in processor.check_pending_events():
                # logger.debug(f"Orchestrator yielding timeout event: {event.get('type')}")
                yield event
            
            # If streaming is done and queue is empty, exit
            if streaming_done.is_set() and output_queue.empty():
                break
            
            # Small delay to prevent busy waiting
            await asyncio.sleep(0.1)
        
        # Final check for any remaining pending events
        async for event in processor.check_pending_events():
            # logger.debug(f"Orchestrator yielding final pending event: {event.get('type')}")
            yield event
        
        # Send done event
        yield {
            "type": "done",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Orchestrated stream error: {e}", exc_info=True)
        yield {
            "type": "error",
            "content": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/health")
async def health_check():
    agent = initialize_agent()
    return {
        "status": "healthy",
        "service": "biomni-a1-advanced-v4",
        "agent_initialized": agent is not None,
        "mode": "enhanced-parsing" if agent else "mock",
        "features": [
            "enhanced-reasoning-detection",
            "improved-todo-parsing", 
            "better-encoding-handling",
            "structured-event-streaming",
            "llm-orchestration-layer"
        ]
    }

@app.get("/api/chat/intelligent")
async def chat_with_advanced_a1(
    request: Request,
    message: str = Query(...),
    session_id: str = Query(default="default")
):
    """Enhanced endpoint with better parsing and streaming"""
    
    async def event_generator():
        try:
            async for event in stream_a1_events_v4(message):
                # Send as SSE event with immediate flush
                event_data = json.dumps(event, ensure_ascii=False)
                # logger.debug(f"Sending SSE event to frontend: {event.get('type')}")
                yield {
                    "event": "message",
                    "data": event_data,
                    "retry": 1000  # Retry after 1 second if connection drops
                }
                # Force flush by yielding a keep-alive comment
                yield {
                    "event": "ping",
                    "data": ""
                }
                
        except Exception as e:
            logger.error(f"Event generation error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({
                    "type": "error",
                    "content": str(e),
                    "timestamp": datetime.now().isoformat()
                }, ensure_ascii=False)
            }
    
    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "text/event-stream; charset=utf-8"
        }
    )

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("Biomni A1 Advanced Server v4.0")
    print("Enhanced Features:")
    print("  - Better reasoning detection")
    print("  - Improved todo/planning parsing")
    print("  - Fixed encoding issues")
    print("  - Structured event streaming")
    print("="*60)
    print("\nInitializing A1 agent...")
    agent = initialize_agent()
    if agent:
        print("✓ Ready with enhanced parsing")
    else:
        print("⚠ Running in fallback mode")
    print("\nStarting server on port 8003...")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8003)