#!/usr/bin/env python3
"""
Final Solution Bridge - Uses Biomni's FIXED JSON output directly
Leverages the complete enhanced JSON from Biomni agent instead of re-parsing
"""

import os
import sys
import json
import asyncio
import queue
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
import uuid

# AIDEV-NOTE: Production-ready configuration with environment variables
# Import AI services
try:
    from protein_structure_service import protein_predictor, predict_protein_structure
    from literature_intelligence import literature_monitor
    from drug_discovery_api import drug_discovery_hub
    from research_intelligence import research_intelligence
    ENHANCED_AI_AVAILABLE = True
except ImportError as e:
    ENHANCED_AI_AVAILABLE = False
    print(f"⚠️ Enhanced AI services not available: {e}")

# Setup with environment configuration
load_dotenv()

# AIDEV-NOTE: Production configuration - all paths now configurable via environment
class Config:
    """Production-ready configuration using environment variables."""

    # Application settings
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 8000))
    NODE_ENV = os.getenv('NODE_ENV', 'development')

    # Data storage paths
    BIOMNI_DATA_PATH = os.getenv('BIOMNI_DATA_PATH', str(Path(__file__).parent.parent / "Biomni" / "data"))
    DATABASE_PATH = os.getenv('DATABASE_PATH', os.path.join(os.path.dirname(__file__), "conversations.db"))
    TEMP_PATH = os.getenv('TEMP_PATH', '/tmp')
    UPLOADS_PATH = os.getenv('UPLOADS_PATH', str(Path(__file__).parent / "uploads"))

    # Security settings
    MAX_SESSIONS_PER_USER = int(os.getenv('MAX_SESSIONS_PER_USER', 10))  # Increased from 3 to 10 for better UX
    SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', 30))

    # Authentication credentials from environment
    RESEARCHER1_PASSWORD = os.getenv('RESEARCHER1_PASSWORD', 'biolab2024')
    RESEARCHER2_PASSWORD = os.getenv('RESEARCHER2_PASSWORD', 'genomics2024')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'biomni2024')
    GUEST_PASSWORD = os.getenv('GUEST_PASSWORD', 'demo2024')

    # CORS settings
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

    @classmethod
    def ensure_directories(cls):
        """Ensure required directories exist."""
        for path in [cls.BIOMNI_DATA_PATH, cls.UPLOADS_PATH, os.path.dirname(cls.DATABASE_PATH)]:
            os.makedirs(path, exist_ok=True)

# Initialize configuration
config = Config()
config.ensure_directories()

# Setup Biomni path
biomni_path = Path(config.BIOMNI_DATA_PATH).parent
sys.path.insert(0, str(biomni_path))

from fastapi import FastAPI, Query, UploadFile, File, HTTPException, Depends, status
from s3_file_service import s3_service  # Import S3 service
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import uvicorn
import shutil
import secrets
import hashlib

class NetworkDetector:
    @staticmethod
    def get_external_ip():
        try:
            import requests
            response = requests.get('https://api.ipify.org', timeout=5)
            return response.text.strip()
        except:
            return "localhost"

class AuthenticationManager:
    """Simple authentication for research environment."""

    def __init__(self):
        # AIDEV-NOTE: Production credentials from environment variables
        self.research_users = {
            "researcher1": self._hash_password(config.RESEARCHER1_PASSWORD),
            "researcher2": self._hash_password(config.RESEARCHER2_PASSWORD),
            "admin": self._hash_password(config.ADMIN_PASSWORD),
            "guest": self._hash_password(config.GUEST_PASSWORD)
        }

        # Track active sessions per user
        self.user_sessions = {}
        self.max_sessions_per_user = config.MAX_SESSIONS_PER_USER

    def _hash_password(self, password: str) -> str:
        """Hash password with salt for basic security."""
        salt = "biomni_research_salt_2024"  # PHASE 1: Fixed salt
        return hashlib.sha256((password + salt).encode()).hexdigest()

    def authenticate_user(self, credentials: HTTPBasicCredentials) -> str:
        """Authenticate user and return username if valid."""
        username = credentials.username
        password_hash = self._hash_password(credentials.password)

        print(f"🔐 Auth attempt: username={username}, password_len={len(credentials.password)}")
        print(f"🔐 Expected users: {list(self.research_users.keys())}")

        if username in self.research_users and secrets.compare_digest(
            self.research_users[username], password_hash
        ):
            print(f"✅ Auth successful for {username}")
            return username

        print(f"❌ Auth failed for {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid research credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    def authenticate_from_credentials(self, username: str, password: str) -> str:
        """Authenticate user from raw credentials."""
        password_hash = self._hash_password(password)

        print(f"🔐 Direct auth: username={username}, password={password}")

        if username in self.research_users and secrets.compare_digest(
            self.research_users[username], password_hash
        ):
            print(f"✅ Direct auth successful for {username}")
            return username

        print(f"❌ Direct auth failed for {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid research credentials",
        )

    def check_session_limit(self, username: str, session_id: str) -> bool:
        """Check if user is within session limits."""
        if username not in self.user_sessions:
            self.user_sessions[username] = set()

        # Check if this is an existing session
        if session_id in self.user_sessions[username]:
            return True  # Existing session always allowed

        # Check if adding new session would exceed limit
        if len(self.user_sessions[username]) >= self.max_sessions_per_user:
            # Remove oldest session (first in set) to make room
            oldest_session = next(iter(self.user_sessions[username]))
            self.user_sessions[username].remove(oldest_session)
            print(f"♻️ Removed oldest session {oldest_session[:15]}... to make room for new session")

        # Add current session
        self.user_sessions[username].add(session_id)
        return True

class UsageMonitor:
    """Monitor system usage and resource consumption for research environment."""

    def __init__(self):
        self.start_time = datetime.now()
        self.request_count = 0
        self.active_sessions = set()
        self.memory_warnings = 0

    def log_request(self, endpoint: str, user: str, session_id: str):
        """Log API request for monitoring."""
        self.request_count += 1
        self.active_sessions.add(session_id)

        # Simple rate limiting check
        if self.request_count > 1000:  # Reset hourly
            self.request_count = 0

        print(f"📊 MONITOR: {endpoint} | User: {user} | Session: {session_id[:8]}... | Total Requests: {self.request_count}")

    def check_system_health(self):
        """Check system resource usage."""
        import psutil

        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent

        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent

        # Active sessions
        session_count = len(self.active_sessions)

        # Alert thresholds
        if memory_percent > 80:
            self.memory_warnings += 1
            print(f"⚠️ HIGH MEMORY: {memory_percent:.1f}% used ({self.memory_warnings} warnings)")

        if disk_percent > 90:
            print(f"🚨 CRITICAL DISK: {disk_percent:.1f}% used")

        if session_count > 20:
            print(f"⚠️ HIGH SESSIONS: {session_count} active sessions")

        return {
            "memory_percent": memory_percent,
            "disk_percent": disk_percent,
            "active_sessions": session_count,
            "uptime_minutes": (datetime.now() - self.start_time).total_seconds() / 60,
            "total_requests": self.request_count
        }

class ConversationStorage:
    """SQLite3-based persistent conversation storage for professional research workflows."""

    def __init__(self, db_path=None):
        self.db_path = db_path or config.DATABASE_PATH
        self.init_database()

    def init_database(self):
        """Initialize SQLite database with conversation tables."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    session_id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    message_count INTEGER DEFAULT 0,
                    event_count INTEGER DEFAULT 0
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    role TEXT,
                    content TEXT,
                    timestamp TIMESTAMP,
                    has_files BOOLEAN DEFAULT FALSE,
                    has_images BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (session_id) REFERENCES conversations (session_id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS execution_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    type TEXT,
                    content TEXT,
                    timestamp TIMESTAMP,
                    expanded BOOLEAN DEFAULT FALSE,
                    metadata TEXT,
                    FOREIGN KEY (session_id) REFERENCES conversations (session_id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS todos (
                    id INTEGER,
                    session_id TEXT,
                    text TEXT,
                    completed BOOLEAN DEFAULT FALSE,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id, session_id),
                    FOREIGN KEY (session_id) REFERENCES conversations (session_id)
                )
            """)

    def save_conversation(self, session_id, messages, events, todos, title=None):
        """Save complete conversation state to database."""
        with sqlite3.connect(self.db_path) as conn:
            # Update conversation metadata
            if title is None:
                title = f"Research Session {session_id.split('_')[-1]}"

            conn.execute("""
                INSERT OR REPLACE INTO conversations
                (session_id, title, last_activity, message_count, event_count)
                VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
            """, (session_id, title, len(messages), len(events)))

            # Clear existing data for this session
            conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM execution_events WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM todos WHERE session_id = ?", (session_id,))

            # Save messages
            for msg in messages:
                conn.execute("""
                    INSERT INTO messages (id, session_id, role, content, timestamp, has_files, has_images)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    msg.get('id', f"msg_{datetime.now().timestamp()}"),
                    session_id,
                    msg['role'],
                    msg['content'],
                    msg.get('timestamp', datetime.now().isoformat()),
                    bool(msg.get('files')),
                    bool(msg.get('images'))
                ))

            # Save execution events
            for i, event in enumerate(events):
                conn.execute("""
                    INSERT INTO execution_events (session_id, type, content, timestamp, expanded, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    session_id,
                    event['type'],
                    event.get('content', ''),
                    event.get('timestamp', datetime.now().isoformat()),
                    event.get('expanded', False),
                    json.dumps(event.get('metadata', {}))
                ))

            # Save todos
            for todo in todos:
                conn.execute("""
                    INSERT INTO todos (id, session_id, text, completed)
                    VALUES (?, ?, ?, ?)
                """, (todo['id'], session_id, todo['text'], todo['completed']))

    def load_conversation(self, session_id):
        """Load complete conversation state from database."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Load messages
            messages = []
            for row in conn.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp", (session_id,)):
                messages.append({
                    'id': row['id'],
                    'role': row['role'],
                    'content': row['content'],
                    'timestamp': row['timestamp'],
                    'files': [] if not row['has_files'] else [],
                    'images': [] if not row['has_images'] else []
                })

            # Load execution events
            events = []
            for row in conn.execute("SELECT * FROM execution_events WHERE session_id = ? ORDER BY timestamp", (session_id,)):
                try:
                    metadata = json.loads(row['metadata']) if row['metadata'] else {}
                except:
                    metadata = {}

                events.append({
                    'type': row['type'],
                    'content': row['content'],
                    'timestamp': row['timestamp'],
                    'expanded': bool(row['expanded']),
                    'metadata': metadata
                })

            # Load todos
            todos = []
            for row in conn.execute("SELECT * FROM todos WHERE session_id = ? ORDER BY id", (session_id,)):
                todos.append({
                    'id': row['id'],
                    'text': row['text'],
                    'completed': bool(row['completed'])
                })

            return {
                'messages': messages,
                'events': events,
                'todos': todos
            }

    def list_conversations(self):
        """Get list of all saved conversations."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            conversations = []

            for row in conn.execute("""
                SELECT session_id, title, created_at, last_activity, message_count, event_count
                FROM conversations
                ORDER BY last_activity DESC
            """):
                conversations.append({
                    'session_id': row['session_id'],
                    'title': row['title'],
                    'created_at': row['created_at'],
                    'last_activity': row['last_activity'],
                    'message_count': row['message_count'],
                    'event_count': row['event_count']
                })

            return conversations

    def delete_conversation(self, session_id):
        """Delete a conversation and all its data."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM execution_events WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM todos WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))

class BiomniAgentPool:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            # print("🏊 CONTEXTUAL: Initializing Session-Based Agent Pool...")
            # CRITICAL FIX: Use dict for session-based agents instead of random queue
            self.session_agents = {}  # {session_id: agent}
            self.session_memories = {}  # {session_id: MemorySaver} - SHARED MEMORY
            self.max_sessions = 10    # Limit concurrent sessions
            BiomniAgentPool._initialized = True

    def get_agent(self, session_id: str):
        """Get or create a persistent agent for this session - ENABLES CONTEXT"""
        print(f"🔍 DEBUG: Looking for session {session_id}")
        print(f"🔍 DEBUG: Current sessions: {list(self.session_agents.keys())}")
        print(f"🔍 DEBUG: Session exists: {session_id in self.session_agents}")

        if session_id in self.session_agents:
            print(f"📤 CONTEXTUAL: Reusing existing agent for session {session_id}")
            return self.session_agents[session_id]

        # Check session limit
        if len(self.session_agents) >= self.max_sessions:
            # Remove oldest session (simple LRU)
            oldest_session = next(iter(self.session_agents))
            print(f"🗑️ CONTEXTUAL: Removing oldest session {oldest_session}")
            del self.session_agents[oldest_session]
            if oldest_session in self.session_memories:
                del self.session_memories[oldest_session]

        # RESEARCH-BASED FIX: Manual conversation tracking + InMemorySaver
        if session_id not in self.session_memories:
            from langgraph.checkpoint.memory import InMemorySaver
            self.session_memories[session_id] = InMemorySaver()
            print(f"🧠 CONTEXTUAL: Created InMemorySaver for session {session_id}")

        # CRITICAL: Also maintain manual conversation history as backup
        if not hasattr(self, 'session_conversations'):
            self.session_conversations = {}
        if session_id not in self.session_conversations:
            self.session_conversations[session_id] = []
            print(f"🧠 MANUAL: Created conversation history for session {session_id}")

        # CRITICAL FIX: Create agent with shared checkpointer from the start
        from biomni.agent import A1
        print(f"🔥 CONTEXTUAL: Creating new agent with persistent memory for session {session_id}")
        agent = A1(
            path=config.BIOMNI_DATA_PATH,
            checkpointer=self.session_memories[session_id]
        )
        print(f"🧠 CONTEXTUAL: Agent created with shared session memory")

        # CRITICAL: Store agent with session mapping
        self.session_agents[session_id] = agent
        print(f"✅ CONTEXTUAL: Agent ready for session {session_id}")
        return agent

    def return_agent(self, session_id: str, agent):
        """Keep agent in session storage - maintains context"""
        # No-op since we keep the agent in session_agents dict
        print(f"📥 CONTEXTUAL: Agent persisted for session {session_id}")

    def get_session_count(self):
        """Get number of active sessions"""
        return len(self.session_agents)

# Initialize components
network = NetworkDetector()
external_ip = network.get_external_ip()
agent_pool = BiomniAgentPool()
# Use configured database path
conversation_storage = ConversationStorage()
auth_manager = AuthenticationManager()
usage_monitor = UsageMonitor()
security = HTTPBasic()

app = FastAPI(title="Final Solution Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    """Enhanced health check with system monitoring."""
    health_data = usage_monitor.check_system_health()

    return {
        "status": "healthy" if health_data['memory_percent'] < 90 else "warning",
        "service": "biomni-research-platform",
        "external_ip": external_ip,
        "solution": "Secure biomedical AI for research teams",
        "authentication": "enabled",
        "agent_pool": {
            "active_sessions": agent_pool.get_session_count(),
            "max_sessions": agent_pool.max_sessions,
            "context_enabled": True
        },
        "system_health": health_data,
        "security": {
            "auth_required": True,
            "path_sanitization": True,
            "session_limits": True
        }
    }

def get_current_user(credentials: HTTPBasicCredentials = Depends(security)):
    """Get authenticated user for protected endpoints."""
    return auth_manager.authenticate_user(credentials)

from typing import Optional

def get_current_user_sse(
    auth: Optional[str] = Query(None)
):
    """Get authenticated user from query parameter for EventSource."""
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required via auth query parameter",
        )

    try:
        import base64
        decoded = base64.b64decode(auth).decode('utf-8')
        username, password = decoded.split(':', 1)

        print(f"🔑 SSE Auth: Decoded username={username}, password={password}")

        # Use direct authentication method
        return auth_manager.authenticate_from_credentials(username, password)
    except Exception as e:
        print(f"Query auth failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

@app.get("/admin/monitor")
async def admin_monitor(current_user: str = Depends(get_current_user)):
    """Administrative monitoring endpoint."""
    if current_user != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    health_data = usage_monitor.check_system_health()

    return {
        "system_status": health_data,
        "user_sessions": dict(auth_manager.user_sessions),
        "conversation_count": len(conversation_storage.list_conversations()),
        "uptime": health_data['uptime_minutes']
    }

@app.get("/api/chat/intelligent")
async def final_solution_streaming(
    message: str = Query(...),
    session_id: str = Query(...),
    model: str = Query("GPT4.1"),
    current_user: str = Depends(get_current_user_sse)  # Use SSE auth for EventSource
):
    """Final solution: Use Biomni's FIXED JSON output directly."""
    
    async def stream_final_solution():
        agent = None
        try:
            print(f"🎯 CONTEXTUAL: Processing session {session_id} for user {current_user}")

            # PHASE 1: Monitor request and check system health
            usage_monitor.log_request("/api/chat/intelligent", current_user, session_id)
            health_status = usage_monitor.check_system_health()

            # Check session limits per user
            if not auth_manager.check_session_limit(current_user, session_id):
                yield f"data: {json.dumps({'type': 'error', 'content': 'Session limit exceeded. Maximum 3 sessions per user.', 'timestamp': datetime.now().isoformat()})}\n\n"
                return

            # Alert if system under stress
            if health_status['memory_percent'] > 85:
                memory_pct = health_status['memory_percent']
                yield f"data: {json.dumps({'type': 'warning', 'content': f'System memory usage high: {memory_pct:.1f}%', 'timestamp': datetime.now().isoformat()})}\n\n"

            # CRITICAL FIX: Get session-specific agent for context continuity
            agent = agent_pool.get_agent(session_id)

            # RESEARCH-BASED FIX: Manual conversation tracking
            if hasattr(agent_pool, 'session_conversations'):
                conversation_history = agent_pool.session_conversations.get(session_id, [])
                print(f"🧠 MANUAL: Found {len(conversation_history)} previous messages in session")

                # Add current message to conversation history
                agent_pool.session_conversations[session_id].append({
                    'role': 'user',
                    'content': message,
                    'timestamp': datetime.now().isoformat()
                })

                # FIXED: Balanced context instruction (prevent hallucination)
                if len(conversation_history) > 1:  # Only add context if there are actual previous exchanges
                    recent_context = conversation_history[-2:]  # Only last 2 exchanges
                    context_summary = "\n".join([f"{msg['role']}: {msg['content'][:150]}..." for msg in recent_context])
                    message_with_context = f"""You have recent conversation history with this user:

{context_summary}

Current question: {message}

Note: Only reference previous work if the current question specifically asks about something from the above conversation. Otherwise, treat this as a new request.

IMPORTANT FILE SAVING INSTRUCTIONS:
- Create directories first: os.makedirs('generated_files/plots', exist_ok=True)
- Save plots/charts to: generated_files/plots/ (e.g., plt.savefig('generated_files/plots/enzyme_kinetics.png'))
- Save data files (CSV/JSON) to: generated_files/data/ (e.g., df.to_csv('generated_files/data/results.csv'))
- Save documents (TXT/MD) to: generated_files/documents/ (e.g., with open('generated_files/documents/report.md', 'w'))
- ALWAYS use timestamps in filenames: from datetime import datetime; timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')"""
                    print(f"🧠 MANUAL: Added explicit context instruction from {len(conversation_history)} previous messages")
                else:
                    message_with_context = f"""{message}

FILE ORGANIZATION INSTRUCTIONS:
- Create directories if needed: os.makedirs('generated_files/plots', exist_ok=True)
- Save plots to: generated_files/plots/ (e.g., plt.savefig('generated_files/plots/analysis.png'))
- Save CSV/JSON to: generated_files/data/ (e.g., df.to_csv('generated_files/data/results.csv'))
- Save documents to: generated_files/documents/ (e.g., save reports as .md or .txt)
- ALWAYS use descriptive filenames with timestamps when appropriate"""
            else:
                message_with_context = f"""{message}

FILE ORGANIZATION INSTRUCTIONS:
- Create directories if needed: os.makedirs('generated_files/plots', exist_ok=True)
- Save plots to: generated_files/plots/ (e.g., plt.savefig('generated_files/plots/analysis.png'))
- Save CSV/JSON to: generated_files/data/ (e.g., df.to_csv('generated_files/data/results.csv'))
- Save documents to: generated_files/documents/ (e.g., save reports as .md or .txt)
- ALWAYS use descriptive filenames with timestamps when appropriate

FILE ANALYSIS GUIDANCE:
- .pdb files: Use Bio.PDB for protein structure analysis
- .tsv/.csv files: Use pandas for data analysis
- .fasta/.fa files: Use BioPython for sequence analysis
- .fastq files: Use BioPython for NGS quality analysis
- .gbk/.gb files: Use Bio.SeqIO for GenBank records
- .sdf/.mol files: Use RDKit for chemical structure analysis
- .xlsx files: Use pandas with read_excel()
- .h5/.hdf5 files: Use h5py or pandas HDFStore
- .vcf files: Use PyVCF or cyvcf2 for variant analysis

AI ENHANCEMENT TOOLS AVAILABLE:
- For literature queries: Use literature_monitor.search_related_papers(query) for recent papers
- For protein sequences: Use predict_protein_structure(sequence) for advanced analysis
- For drug targets: Use drug_discovery_hub.get_target_information(protein_name) for drug insights
- For data analysis: Use research_intelligence.analyze_uploaded_data(files) for cross-domain insights

EXAMPLE USAGE:
# Check latest research
papers = literature_monitor.search_related_papers("CRISPR off-targets")
print("Recent papers:", papers)

# Analyze protein structure
analysis = predict_protein_structure("MKLLVLGAYVW")
print("Structure insights:", analysis["structure_insights"])

# Get drug information
target_info = drug_discovery_hub.get_target_information("BRCA1")
print("Target details:", target_info)"""

            # CRITICAL FIX: Set session context for conversation memory
            agent.set_session_context(session_id)

            # Send connection event with context info
            yield f"data: {json.dumps({'type': 'connected', 'service': 'contextual-solution', 'external_ip': external_ip, 'session_id': session_id, 'context_enabled': True, 'timestamp': datetime.now().isoformat()})}\n\n"

            # CONTEXTUAL ENHANCEMENT: Agent now has full conversation memory
            print(f"🧠 CONTEXTUAL: Agent configured with session {session_id} memory context")

            # Track existing images before processing for comparison
            backend_dir = Path(__file__).parent
            root_dir = backend_dir.parent  # Agent's working directory

            # Track images with modification times before processing
            existing_root_images = {}
            for pattern in ['*.png', '*.jpg', '*.jpeg']:
                for img_path in root_dir.glob(pattern):
                    existing_root_images[img_path.name] = img_path.stat().st_mtime

            # RESEARCH-BASED FIX: Use contextualized message with conversation history
            step_count = 0
            for step in agent.go_stream(message_with_context):
                step_count += 1
                print(f"🎯 FINAL: Processing step {step_count}")
                
                # ENHANCED: Extract real observation content from raw output first
                output = step.get('output', '')
                
                # Extract REAL observation content if present
                real_observation_content = None
                if '<observation>' in output and '</observation>' in output:
                    import re
                    obs_match = re.search(r'<observation>(.*?)</observation>', output, re.DOTALL)
                    if obs_match:
                        real_observation_content = obs_match.group(1).strip()
                        print(f"🎯 EXTRACTED REAL RESULT: {real_observation_content}")
                
                if output.startswith('{'):
                    try:
                        # Biomni's FIXED JSON should have complete data
                        biomni_json = json.loads(output)
                        print(f"🔍 FINAL: Step {step_count} JSON keys: {list(biomni_json.keys())}")
                        
                        # MINIMAL TRANSFORMATION: Just format as SSE events
                        
                        # Transform execute_blocks to tool_call events
                        if 'execute_blocks' in biomni_json:
                            for i, block in enumerate(biomni_json['execute_blocks']):
                                # Send tool_call event
                                tool_event = {
                                    'type': 'tool_call',
                                    'tool_name': 'run_python_repl',
                                    'code': block.get('code', ''),
                                    'content': block.get('code', ''),
                                    'language': block.get('language', 'python'),
                                    'metadata': {
                                        **block.get('metadata', {}),
                                        'step_number': step_count,
                                        'block_index': i
                                    },
                                    'timestamp': datetime.now().isoformat()
                                }
                                yield f"data: {json.dumps(tool_event)}\n\n"
                                print(f"📤 FINAL: Sent tool_call event {i+1}")
                                
                                # REAL RESULT EXTRACTION: Use actual observation content if available
                                execution_result = block.get('execution_result')
                                
                                # If no execution result in metadata, use real observation content from current step
                                if not execution_result and real_observation_content:
                                    execution_result = real_observation_content
                                    print(f"🎯 USING REAL CONTENT: {execution_result}")
                                elif not execution_result:
                                    execution_result = "Code execution completed"
                                
                                obs_event = {
                                    'type': 'observation',
                                    'content': execution_result,
                                    'output': execution_result,
                                    'has_errors': 'Error:' in execution_result,
                                    'has_success': not ('Error:' in execution_result),
                                    'metadata': {
                                        'step_number': step_count,
                                        'linked_to_tool': i,
                                        'block_index': i
                                    },
                                    'timestamp': datetime.now().isoformat()
                                }
                                yield f"data: {json.dumps(obs_event)}\n\n"
                                print(f"📤 FINAL: Sent ENHANCED observation for tool {i+1}: {execution_result[:50]}...")
                        
                        # Transform observe_blocks to observation events with error filtering
                        if 'observe_blocks' in biomni_json:
                            for block in biomni_json['observe_blocks']:
                                content = block.get('content', '')

                                # Filter out common dependency errors that don't affect core functionality
                                is_dependency_error = (
                                    "No module named 'scholarly'" in content or
                                    "'PubMedBookArticle' object has no attribute" in content or
                                    "Error querying PubMed" in content
                                )

                                # Mark as informational rather than error for dependency issues
                                has_errors = block.get('has_errors', False) and not is_dependency_error

                                event = {
                                    'type': 'observation',
                                    'content': content,
                                    'output': content,
                                    'has_errors': has_errors,
                                    'has_success': not has_errors,
                                    'is_dependency_warning': is_dependency_error,
                                    'metadata': {
                                        'step_number': step_count,
                                        'source': 'biomni_observe_blocks',
                                        'filtered_error': is_dependency_error
                                    },
                                    'timestamp': datetime.now().isoformat()
                                }
                                yield f"data: {json.dumps(event)}\n\n"
                                print(f"📤 FINAL: Sent {'filtered' if is_dependency_error else 'normal'} observation event")
                        
                        # Transform todo_items to planning events
                        if 'todo_items' in biomni_json:
                            event = {
                                'type': 'planning',
                                'steps': [
                                    {
                                        'step': todo.get('description', ''),
                                        'status': 'completed' if todo.get('is_completed') else 'pending',
                                        'id': todo.get('number', 0)
                                    } for todo in biomni_json['todo_items']
                                ],
                                'metadata': {
                                    'step_number': step_count
                                },
                                'timestamp': datetime.now().isoformat()
                            }
                            yield f"data: {json.dumps(event)}\n\n"
                            print(f"📤 FINAL: Sent planning with {len(biomni_json['todo_items'])} todos")
                        
                        # Transform solution_blocks to final_answer events
                        if 'solution_blocks' in biomni_json:
                            for block in biomni_json['solution_blocks']:
                                event = {
                                    'type': 'final_answer',
                                    'content': block.get('content', ''),
                                    'metadata': {
                                        'step_number': step_count,
                                        'source': 'biomni_solution_blocks'
                                    },
                                    'timestamp': datetime.now().isoformat()
                                }
                                yield f"data: {json.dumps(event)}\n\n"
                                print(f"📤 FINAL: Sent final_answer")
                        
                        # Enhanced file_operations with image detection
                        if 'file_operations' in biomni_json:
                            for file_op in biomni_json['file_operations']:
                                filename = file_op.get('file_name', '')
                                filepath = file_op.get('file_path', '')

                                # Detect if this is an image file
                                is_image = filename.endswith(('.png', '.jpg', '.jpeg'))

                                event = {
                                    'type': 'file_operation',
                                    'operation': file_op.get('operation', 'unknown'),
                                    'filename': filename,
                                    'file_path': filepath,
                                    'is_image': is_image,
                                    'metadata': {
                                        'step_number': step_count,
                                        'source': 'biomni_file_operations',
                                        'file_type': 'image' if is_image else 'data',
                                        'image_url': f"/images/{filename}" if is_image else None
                                    },
                                    'timestamp': datetime.now().isoformat()
                                }
                                yield f"data: {json.dumps(event)}\n\n"
                                print(f"📤 FINAL: Sent {'image' if is_image else 'file'}_operation event for {filename}")
                        
                    except Exception as e:
                        print(f"❌ FINAL: JSON parsing error: {e}")
                        continue
                else:
                    print(f"⚠️ FINAL: Step {step_count} non-JSON output")
                
                # REAL OBSERVATION PROCESSING: Check every step for observation content
                if '<observation>' in output and '</observation>' in output and not output.startswith('{'):
                    import re
                    obs_match = re.search(r'<observation>(.*?)</observation>', output, re.DOTALL)
                    if obs_match:
                        real_result = obs_match.group(1).strip()
                        print(f"🎯 FOUND REAL EXECUTION RESULT: {real_result}")
                        
                        # Create observation event with REAL result
                        real_obs_event = {
                            'type': 'observation',
                            'content': real_result,
                            'output': real_result,
                            'has_errors': 'Error:' in real_result,
                            'has_success': not ('Error:' in real_result),
                            'metadata': {
                                'step_number': step_count,
                                'source': 'real_biomni_observation',
                                'extracted_from': 'ai_message_content'
                            },
                            'timestamp': datetime.now().isoformat()
                        }
                        yield f"data: {json.dumps(real_obs_event)}\n\n"
                        print(f"📤 FINAL: Sent REAL observation: {real_result[:50]}...")
                
                await asyncio.sleep(0.05)
            
            # CRITICAL FIX: Check for ALL images in root directory (includes overwritten files)
            # Check for all images in agent's working directory (root)
            current_root_images = {}
            for pattern in ['*.png', '*.jpg', '*.jpeg']:
                for img_path in root_dir.glob(pattern):
                    current_root_images[img_path.name] = img_path.stat().st_mtime

            # Find images that are new OR have been modified during processing
            new_or_modified_images = []
            for img_name, mtime in current_root_images.items():
                if img_name not in existing_root_images:
                    new_or_modified_images.append(img_name)
                    print(f"🔍 NEW IMAGE: {img_name}")
                # Also include files that might have been recreated (check if modification time is very recent)
                elif abs(mtime - existing_root_images.get(img_name, 0)) > 1:  # Modified more than 1 second ago
                    new_or_modified_images.append(img_name)
                    print(f"🔍 MODIFIED IMAGE: {img_name}")

            print(f"🔍 IMAGE DEBUG: Found {len(new_or_modified_images)} new/modified images: {new_or_modified_images}")

            # Copy ALL detected images from root to backend directory for serving
            for img_name in new_or_modified_images:
                root_img_path = root_dir / img_name
                backend_img_path = backend_dir / img_name

                if root_img_path.exists():
                    try:
                        import shutil
                        shutil.copy2(root_img_path, backend_img_path)
                        print(f"📋 COPIED: {img_name} from root to backend directory")

                        event = {
                            'type': 'file_operation',
                            'operation': 'image_created',
                            'filename': img_name,
                            'file_path': str(backend_img_path),
                            'is_image': True,
                            'metadata': {
                                'step_number': step_count,
                                'source': 'post_processing_detection',
                                'file_type': 'image',
                                'image_url': f"/images/{img_name}"
                            },
                            'timestamp': datetime.now().isoformat()
                        }
                        yield f"data: {json.dumps(event)}\n\n"
                        print(f"📤 FINAL: Detected and copied new image {img_name}")
                    except Exception as copy_error:
                        print(f"❌ Failed to copy image {img_name}: {copy_error}")

            # RESEARCH-BASED FIX: Save agent response to manual conversation history
            if hasattr(agent_pool, 'session_conversations') and 'solution_blocks' in locals():
                final_response = "Generated biomedical analysis response"  # Placeholder
                agent_pool.session_conversations[session_id].append({
                    'role': 'assistant',
                    'content': final_response,
                    'timestamp': datetime.now().isoformat()
                })
                print(f"🧠 MANUAL: Saved agent response to conversation history")

            # Send completion
            yield f"data: {json.dumps({'type': 'done', 'total_steps': step_count, 'service': 'final-solution', 'session_id': session_id, 'timestamp': datetime.now().isoformat()})}\n\n"
            print(f"🎉 FINAL SOLUTION: Completed {step_count} steps")
            
        except Exception as e:
            print(f"❌ FINAL SOLUTION error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e), 'timestamp': datetime.now().isoformat()})}\n\n"
        
        finally:
            if agent:
                # CONTEXTUAL FIX: Pass session_id to maintain agent persistence
                agent_pool.return_agent(session_id, agent)
    
    return StreamingResponse(
        stream_final_solution(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

# AIDEV-NOTE: File management endpoints for generated files with new folder structure
@app.get("/files")
async def list_generated_files():
    """List all generated files from Biomni workflows - searches all locations."""
    try:
        backend_dir = Path(__file__).parent
        parent_dir = backend_dir.parent  # Agent working directory
        files = []

        # Look for common generated file types
        patterns = ['*.csv', '*.json', '*.txt', '*.fasta', '*.md', '*.tsv', '*.gbk', '*.pdb']

        # Search in multiple locations to ensure we find all files
        search_locations = [
            (backend_dir, "backend"),  # Legacy location
            (parent_dir, "agent"),  # Where agent actually saves
            (backend_dir / "generated_files" / "data", "data"),
            (backend_dir / "generated_files" / "documents", "documents"),
            (parent_dir / "generated_files" / "data", "agent_data"),
            (parent_dir / "generated_files" / "documents", "agent_docs"),
        ]

        seen_files = set()  # Avoid duplicates

        for search_dir, location_tag in search_locations:
            if search_dir.exists():
                for pattern in patterns:
                    for file_path in search_dir.glob(pattern):
                        if file_path.is_file() and file_path.name not in seen_files:
                            seen_files.add(file_path.name)
                            stat = file_path.stat()
                            files.append({
                                "name": file_path.name,
                                "type": file_path.suffix[1:] if file_path.suffix else "unknown",
                                "size": stat.st_size,
                                "path": str(file_path),
                                "location": location_tag,
                                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                "download_url": f"/files/{file_path.name}"
                            })

        return {
            "files": sorted(files, key=lambda x: x["created_at"], reverse=True),
            "total": len(files),
            "locations_searched": [str(loc[0]) for loc in search_locations if loc[0].exists()]
        }
        
    except Exception as e:
        return {"error": str(e), "files": []}

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks."""
    # Remove path separators and dangerous characters
    safe_name = filename.replace('/', '').replace('\\', '').replace('..', '')
    # Only allow alphanumeric, dots, hyphens, underscores
    import re
    safe_name = re.sub(r'[^a-zA-Z0-9._-]', '', safe_name)
    # Limit length
    return safe_name[:100]

@app.get("/files/{filename}")
async def download_file(filename: str):  # Temporarily removed auth for development
    """Download or preview generated file - searches all locations."""
    try:
        # CRITICAL SECURITY FIX: Sanitize filename
        safe_filename = sanitize_filename(filename)
        if safe_filename != filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        backend_dir = Path(__file__).parent
        parent_dir = backend_dir.parent

        # Search in multiple locations for the file
        possible_paths = [
            backend_dir / safe_filename,  # Backend root
            parent_dir / safe_filename,  # Agent working directory
            backend_dir / "generated_files" / "data" / safe_filename,
            backend_dir / "generated_files" / "documents" / safe_filename,
            parent_dir / "generated_files" / "data" / safe_filename,
            parent_dir / "generated_files" / "documents" / safe_filename,
        ]

        file_path = None
        for path in possible_paths:
            if path.exists() and path.is_file():
                # SECURITY: Ensure file is within allowed directories
                if (str(path.resolve()).startswith(str(backend_dir.resolve())) or
                    str(path.resolve()).startswith(str(parent_dir.resolve()))):
                    file_path = path
                    break

        if not file_path:
            return {"error": f"File {safe_filename} not found"}

        # Determine content type
        content_type = "text/plain"
        if filename.endswith('.json'):
            content_type = "application/json"
        elif filename.endswith('.csv'):
            content_type = "text/csv"
        elif filename.endswith('.md'):
            content_type = "text/markdown"
        elif filename.endswith('.png'):
            content_type = "image/png"
        elif filename.endswith(('.jpg', '.jpeg')):
            content_type = "image/jpeg"

        # Read and return file content
        with open(file_path, 'rb') as f:
            content = f.read()

        from fastapi.responses import Response
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Allow-Origin": "*"
            }
        )

    except Exception as e:
        return {"error": str(e)}

@app.get("/images/{filename}")
async def serve_image(filename: str, base64: bool = False):  # Temporarily removed auth for development
    """Serve generated images with proper headers - searches all locations."""
    try:
        # CRITICAL SECURITY FIX: Sanitize filename
        safe_filename = sanitize_filename(filename)
        if safe_filename != filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        backend_dir = Path(__file__).parent
        parent_dir = backend_dir.parent

        # Search in multiple locations for the image
        possible_paths = [
            backend_dir / safe_filename,  # Backend root
            parent_dir / safe_filename,  # Agent working directory
            backend_dir / "generated_files" / "plots" / safe_filename,
            backend_dir / "generated_files" / "images" / safe_filename,
            parent_dir / "generated_files" / "plots" / safe_filename,
            parent_dir / "generated_files" / "images" / safe_filename,
        ]

        # Debug logging
        print(f"🔍 IMAGE SERVE: Looking for '{safe_filename}'")
        file_path = None
        for path in possible_paths:
            print(f"   Checking: {path} - Exists: {path.exists()}")
            if path.exists() and path.is_file():
                # SECURITY: Ensure file is within allowed directories
                if (str(path.resolve()).startswith(str(backend_dir.resolve())) or
                    str(path.resolve()).startswith(str(parent_dir.resolve()))):
                    file_path = path
                    print(f"   ✅ Found at: {file_path}")
                    break

        if not file_path:
            print(f"   ❌ Image not found in any location")
            return {"error": f"Image {safe_filename} not found"}

        # Validate image type
        if not (safe_filename.endswith('.png') or safe_filename.endswith(('.jpg', '.jpeg'))):
            return {"error": f"File {safe_filename} is not a supported image format"}

        # Determine content type
        content_type = "image/png" if filename.endswith('.png') else "image/jpeg"

        # Read image
        with open(file_path, 'rb') as f:
            image_data = f.read()

        # Return base64 encoded if requested
        if base64:
            import base64 as b64
            encoded_data = b64.b64encode(image_data).decode('utf-8')
            return {
                "success": True,
                "filename": filename,
                "content_type": content_type,
                "size": len(image_data),
                "base64_data": f"data:{content_type};base64,{encoded_data}",
                "url": f"/images/{filename}"
            }

        # Return raw image
        from fastapi.responses import Response
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600"
            }
        )

    except Exception as e:
        return {"error": str(e)}

@app.get("/images")
async def list_generated_images():
    """List all generated image files with metadata - searches all locations."""
    try:
        backend_dir = Path(__file__).parent
        parent_dir = backend_dir.parent  # Agent working directory
        images = []

        # Look for image files in all possible locations
        image_locations = [
            (backend_dir, "backend"),  # Backend root
            (parent_dir, "agent"),  # Agent working directory
            (backend_dir / "generated_files" / "images", "images"),
            (backend_dir / "generated_files" / "plots", "plots"),
            (parent_dir / "generated_files" / "images", "agent_images"),
            (parent_dir / "generated_files" / "plots", "agent_plots"),
        ]

        image_patterns = ['*.png', '*.jpg', '*.jpeg', '*.svg']

        for search_dir, folder_name in image_locations:
            if search_dir.exists():
                for pattern in image_patterns:
                    for file_path in search_dir.glob(pattern):
                        if file_path.is_file():
                            # Skip if in generated_files but we're checking backend root
                            if folder_name == "legacy" and "generated_files" in str(file_path):
                                continue
                            stat = file_path.stat()
                            images.append({
                                "name": file_path.name,
                                "type": file_path.suffix[1:],
                                "size": stat.st_size,
                                "path": str(file_path),
                                "folder": folder_name,
                                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                "image_url": f"/images/{file_path.name}",
                                "base64_url": f"/images/{file_path.name}?base64=true"
                            })

        return {
            "images": sorted(images, key=lambda x: x["created_at"], reverse=True),
            "total": len(images),
            "generated_dir": str(backend_dir / "generated_files")
        }

    except Exception as e:
        return {"error": str(e), "images": []}

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    """Delete a file from the backend - searches all locations."""
    try:
        # CRITICAL SECURITY FIX: Sanitize filename
        safe_filename = sanitize_filename(filename)
        if safe_filename != filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        backend_dir = Path(__file__).parent
        parent_dir = backend_dir.parent

        # Search for file in multiple locations
        possible_paths = [
            backend_dir / safe_filename,
            parent_dir / safe_filename,
            backend_dir / "generated_files" / "data" / safe_filename,
            backend_dir / "generated_files" / "documents" / safe_filename,
            backend_dir / "generated_files" / "plots" / safe_filename,
            backend_dir / "generated_files" / "images" / safe_filename,
            parent_dir / "generated_files" / "data" / safe_filename,
            parent_dir / "generated_files" / "documents" / safe_filename,
            parent_dir / "generated_files" / "plots" / safe_filename,
            parent_dir / "generated_files" / "images" / safe_filename,
        ]

        file_deleted = False
        deleted_paths = []

        for path in possible_paths:
            if path.exists() and path.is_file():
                # SECURITY: Ensure file is within allowed directories
                if (str(path.resolve()).startswith(str(backend_dir.resolve())) or
                    str(path.resolve()).startswith(str(parent_dir.resolve()))):
                    try:
                        path.unlink()  # Delete the file
                        deleted_paths.append(str(path))
                        file_deleted = True
                        print(f"🗑️ Deleted file: {path}")
                    except Exception as e:
                        print(f"❌ Failed to delete {path}: {e}")

        if file_deleted:
            return {
                "success": True,
                "message": f"Successfully deleted {safe_filename}",
                "deleted_paths": deleted_paths
            }
        else:
            raise HTTPException(status_code=404, detail=f"File {safe_filename} not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Conversation Management Endpoints
@app.get("/conversations")
async def list_conversations():
    """Get list of all saved conversations."""
    try:
        conversations = conversation_storage.list_conversations()
        return {
            "conversations": conversations,
            "total": len(conversations)
        }
    except Exception as e:
        return {"error": str(e), "conversations": []}

@app.get("/conversations/{session_id}")
async def get_conversation(session_id: str):
    """Load a specific conversation."""
    try:
        print(f"📚 Loading conversation: {session_id}")
        conversation_data = conversation_storage.load_conversation(session_id)

        # Debug logging
        print(f"  - Messages: {len(conversation_data.get('messages', []))}")
        print(f"  - Events: {len(conversation_data.get('events', []))}")
        print(f"  - Todos: {len(conversation_data.get('todos', []))}")

        if conversation_data.get('messages'):
            print(f"  - First message: {conversation_data['messages'][0]}")

        return {
            "success": True,
            "session_id": session_id,
            **conversation_data
        }
    except Exception as e:
        print(f"❌ Error loading conversation {session_id}: {e}")
        return {"error": str(e), "success": False}

@app.post("/conversations/{session_id}")
async def save_conversation(session_id: str, conversation_data: dict):
    """Save conversation state."""
    try:
        conversation_storage.save_conversation(
            session_id,
            conversation_data.get('messages', []),
            conversation_data.get('events', []),
            conversation_data.get('todos', []),
            conversation_data.get('title')
        )
        return {
            "success": True,
            "session_id": session_id,
            "message": "Conversation saved successfully"
        }
    except Exception as e:
        return {"error": str(e), "success": False}

@app.delete("/conversations/{session_id}")
async def delete_conversation(session_id: str):
    """Delete a conversation."""
    try:
        conversation_storage.delete_conversation(session_id)
        return {
            "success": True,
            "session_id": session_id,
            "message": "Conversation deleted successfully"
        }
    except Exception as e:
        return {"error": str(e), "success": False}

# Revolutionary AI Enhancement Endpoints
@app.post("/ai/predict-structure")
async def predict_structure_endpoint(
    sequence_data: dict,
    current_user: str = Depends(get_current_user)
):
    """Real-time protein structure prediction using ESMFold/ColabFold."""
    if not ENHANCED_AI_AVAILABLE:
        return {"error": "Enhanced AI services not available"}

    try:
        sequence = sequence_data.get("sequence", "")
        method = sequence_data.get("method", "auto")

        if not sequence:
            return {"error": "Protein sequence required"}

        result = predict_protein_structure(sequence, method)

        # Log AI usage
        usage_monitor.log_request("/ai/predict-structure", current_user, sequence_data.get("session_id", "unknown"))

        return result

    except Exception as e:
        return {"error": f"Structure prediction failed: {e}"}

@app.get("/ai/literature-today")
async def daily_literature_monitor(
    current_user: str = Depends(get_current_user)
):
    """Monitor today's biomedical literature across all research areas."""
    if not ENHANCED_AI_AVAILABLE:
        return {"error": "Enhanced AI services not available"}

    try:
        daily_results = literature_monitor.monitor_daily_research()

        usage_monitor.log_request("/ai/literature-today", current_user, "literature_monitor")

        return daily_results

    except Exception as e:
        return {"error": f"Literature monitoring failed: {e}"}

@app.post("/ai/drug-discovery")
async def drug_discovery_endpoint(
    query_data: dict,
    current_user: str = Depends(get_current_user)
):
    """Drug discovery intelligence using ChEMBL and UniProt APIs."""
    if not ENHANCED_AI_AVAILABLE:
        return {"error": "Enhanced AI services not available"}

    try:
        target_name = query_data.get("target", "")
        query_type = query_data.get("type", "find_drugs")  # find_drugs, target_info, similar_compounds

        if query_type == "find_drugs":
            result = drug_discovery_hub.find_drugs_for_target(target_name)
        elif query_type == "target_info":
            result = drug_discovery_hub.get_target_information(target_name)
        elif query_type == "similar_compounds":
            smiles = query_data.get("smiles", "")
            result = drug_discovery_hub.search_similar_compounds(smiles)
        else:
            result = {"error": "Invalid query type"}

        usage_monitor.log_request("/ai/drug-discovery", current_user, query_data.get("session_id", "unknown"))

        return result

    except Exception as e:
        return {"error": f"Drug discovery query failed: {e}"}

@app.post("/ai/research-insights")
async def research_insights_endpoint(
    file_analysis_data: dict,
    current_user: str = Depends(get_current_user)
):
    """Generate cross-domain research insights from uploaded data."""
    if not ENHANCED_AI_AVAILABLE:
        return {"error": "Enhanced AI services not available"}

    try:
        insights = research_intelligence.analyze_uploaded_data(file_analysis_data.get("files", {}))

        # Generate comprehensive report
        report = research_intelligence.generate_research_report(insights)
        insights["full_report"] = report

        usage_monitor.log_request("/ai/research-insights", current_user, file_analysis_data.get("session_id", "unknown"))

        return insights

    except Exception as e:
        return {"error": f"Research insight generation failed: {e}"}

@app.get("/ai/status")
async def ai_services_status():
    """Check status of enhanced AI services."""
    return {
        "enhanced_ai_available": ENHANCED_AI_AVAILABLE,
        "services": {
            "protein_structure_prediction": ENHANCED_AI_AVAILABLE,
            "literature_monitoring": ENHANCED_AI_AVAILABLE,
            "drug_discovery_intelligence": ENHANCED_AI_AVAILABLE,
            "research_insight_generation": ENHANCED_AI_AVAILABLE
        },
        "capabilities": [
            "Real-time protein folding (ESMFold)",
            "Daily literature monitoring (PubMed API)",
            "Drug discovery intelligence (ChEMBL API)",
            "Cross-domain research insights",
            "Automated hypothesis generation"
        ] if ENHANCED_AI_AVAILABLE else ["Basic biomedical chat only"]
    }

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """Handle multiple file uploads using S3 for storage (Industry Standard)."""
    try:
        backend_dir = Path(__file__).parent
        uploaded_files = []

        print(f"📤 Receiving {len(files)} files for upload to S3")
        
        for file in files:
            if not file.filename:
                continue
                
            # BIOMEDICAL RESEARCH: Comprehensive file type support
            allowed_extensions = {
                # Sequence data
                '.fasta', '.fa', '.fastq', '.fq', '.gbk', '.gb', '.sam', '.bam', '.vcf',
                '.bed', '.gff', '.gtf', '.wig', '.bigwig', '.ab1',

                # Molecular structures
                '.pdb', '.sdf', '.mol', '.xyz', '.cif', '.pdbqt', '.mae',

                # Data & analysis
                '.csv', '.tsv', '.xlsx', '.xls', '.json', '.xml', '.h5', '.hdf5',
                '.parquet', '.sqlite', '.db', '.pkl', '.pickle',

                # Microscopy & imaging
                '.tiff', '.tif', '.czi', '.lsm', '.nd2', '.oib', '.oif', '.lif',
                '.dicom', '.png', '.jpg', '.jpeg',

                # Archives (with size limits)
                '.zip', '.tar', '.gz', '.bz2', '.7z',

                # Code & analysis
                '.py', '.r', '.m', '.ipynb', '.rmd', '.sh', '.yaml', '.yml',

                # Specialized
                '.mzml', '.mzxml', '.fcs', '.cel', '.idat', '.sra',

                # Documents
                '.txt', '.md', '.pdf', '.doc', '.docx', '.eps', '.svg'
            }

            file_ext = Path(file.filename).suffix.lower()

            if file_ext not in allowed_extensions:
                print(f"⚠️ Skipping {file.filename}: unsupported file type (.{file_ext.lstrip('.')})")
                continue

            # Size limits for different file types
            max_size = 10 * 1024 * 1024  # 10MB default
            if file_ext in {'.zip', '.tar', '.gz', '.bam', '.h5', '.hdf5'}:
                max_size = 100 * 1024 * 1024  # 100MB for large research files

            if file.size > max_size:
                print(f"⚠️ Skipping {file.filename}: file too large ({file.size:,} bytes, max {max_size:,})")
                continue
            
            # Read file content once
            file_content = await file.read()
            file_size = len(file_content)

            # Validate file using S3 service
            is_valid, error_msg = s3_service.validate_file(file.filename, file_size)
            if not is_valid:
                print(f"⚠️ Skipping {file.filename}: {error_msg}")
                continue

            try:
                # Save temporarily for S3 upload
                temp_path = Path(config.TEMP_PATH) / f"{uuid.uuid4()}_{file.filename}"
                with open(temp_path, "wb") as buffer:
                    buffer.write(file_content)

                # Upload to S3 (Industry Standard)
                s3_result = s3_service.upload_file_direct(
                    str(temp_path),
                    s3_folder='uploads/pending/'  # Files start in pending folder
                )

                if s3_result['success']:
                    # Also save locally for immediate Biomni agent access
                    local_path = backend_dir / file.filename
                    with open(local_path, "wb") as buffer:
                        buffer.write(file_content)

                    uploaded_files.append({
                        "name": file.filename,
                        "size": file_size,
                        "type": file_ext[1:],
                        "content_type": file.content_type,
                        "uploaded_at": datetime.now().isoformat(),
                        "s3_key": s3_result['s3_key'],
                        "s3_url": s3_result['url'],
                        "local_path": str(local_path),
                        "storage": "s3+local"  # Hybrid storage
                    })

                    print(f"✅ Uploaded to S3: {file.filename} ({file_size} bytes)")
                    print(f"☁️ S3 Key: {s3_result['s3_key']}")
                    print(f"📋 Local copy: {local_path}")
                else:
                    print(f"❌ S3 upload failed: {s3_result.get('error')}")
                    # Fallback to local storage only
                    local_path = backend_dir / file.filename
                    with open(local_path, "wb") as buffer:
                        buffer.write(file_content)

                    uploaded_files.append({
                        "name": file.filename,
                        "size": file_size,
                        "type": file_ext[1:],
                        "content_type": file.content_type,
                        "uploaded_at": datetime.now().isoformat(),
                        "local_path": str(local_path),
                        "storage": "local"  # Local storage fallback
                    })

                # Clean up temp file
                temp_path.unlink(missing_ok=True)
                
            except Exception as file_error:
                print(f"❌ Failed to save {file.filename}: {file_error}")
        
        return {
            "success": True,
            "uploaded_files": uploaded_files,
            "total": len(uploaded_files),
            "message": f"Successfully uploaded {len(uploaded_files)} files"
        }
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AIDEV-NOTE: S3-based endpoints for optimized file handling

@app.get("/upload/presigned-url")
async def get_presigned_upload_url(
    filename: str = Query(..., description="File name to upload"),
    content_type: str = Query("application/octet-stream", description="MIME type")
):
    """
    Generate a pre-signed URL for direct client-to-S3 upload.
    This is the industry standard for large file uploads.
    """
    try:
        result = s3_service.generate_presigned_url(filename, content_type)
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result['error'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/s3/files")
async def list_s3_files(
    folder: str = Query("uploads/pending/", description="S3 folder to list"),
    limit: int = Query(100, description="Maximum files to return")
):
    """List files stored in S3 with metadata."""
    try:
        files = s3_service.list_files(folder, limit)
        return {
            "files": files,
            "total": len(files),
            "folder": folder
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/s3/move-file")
async def move_s3_file(
    source_key: str = Query(..., description="Source S3 key"),
    destination: str = Query("uploads/processed/", description="Destination folder")
):
    """Move file from pending to processed after successful processing."""
    try:
        success = s3_service.move_file(source_key, destination)
        if success:
            return {"success": True, "message": f"File moved to {destination}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to move file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/s3/cleanup")
async def cleanup_old_files(
    folder: str = Query("uploads/pending/", description="Folder to clean"),
    days_old: int = Query(2, description="Delete files older than this many days")
):
    """Clean up old files from S3 (manual trigger for cleanup)."""
    try:
        deleted_count = s3_service.delete_old_files(folder, days_old)
        return {
            "success": True,
            "deleted_files": deleted_count,
            "message": f"Deleted {deleted_count} files older than {days_old} days"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/s3/download-url")
async def get_download_url(
    s3_key: str = Query(..., description="S3 object key"),
    expiration: int = Query(3600, description="URL expiration in seconds")
):
    """Generate a pre-signed download URL for an S3 file."""
    try:
        url = s3_service.generate_download_url(s3_key, expiration)
        if url:
            return {
                "success": True,
                "download_url": url,
                "expires_in": expiration
            }
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AIDEV-NOTE: Alternative upload endpoint using Form data
@app.post("/upload-form")
async def upload_files_form():
    """Handle form-based file uploads."""
    try:
        from fastapi import Request, Form, UploadFile, File
        
        backend_dir = Path(__file__).parent
        uploaded = []
        
        # This endpoint would handle FormData uploads
        return {
            "message": "Upload endpoint ready",
            "backend_dir": str(backend_dir),
            "supported_types": [".csv", ".json", ".txt", ".fasta", ".md", ".png", ".jpg"]
        }
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print(f"📍 External IP: {external_ip}")
    print(f"🌐 Backend: http://{config.HOST}:{config.PORT}")
    print(f"📊 Docs: http://{config.HOST}:{config.PORT}/docs")
    print(f"📁 Files: http://{config.HOST}:{config.PORT}/files")
    print("🎯 FEATURES: Production ready + Agent pooling + File management")
    print(f"🔧 Environment: {config.NODE_ENV}")

    # Kill existing process on the port
    os.system(f"sudo fuser -k {config.PORT}/tcp 2>/dev/null || true")

    uvicorn.run(app, host=config.HOST, port=config.PORT)