# Biomni Backend Server

This is the backend server for the Biomni Analysis Agent, providing biomedical AI capabilities through Server-Sent Events (SSE).

## Features

- 🧬 **Biomedical AI Agent**: General-purpose biomedical research agent
- 🔬 **Multi-Tool Orchestration**: 100+ scientific tools across domains
- 📊 **Real-time Streaming**: SSE for live updates
- 🧪 **Scientific Computing**: Integration with BioPython, RDKit, etc.
- 🤖 **Multiple LLM Support**: OpenAI, Azure, DeepSeek, Google Vertex AI

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp config/.env.example config/.env
# Edit config/.env with your API keys
```

### 3. Run the Server

```bash
cd server
python biomni_a1_advanced_server_v4.py
```

The server will start on `http://localhost:8000`

## Project Structure

```
backend/
├── server/                 # Main server files
│   ├── biomni_a1_advanced_server_v4.py  # FastAPI SSE server
│   ├── biomni_a1_orchestrator.py        # Event orchestrator
│   └── ...utility files
├── biomni/                # Core Biomni package
│   ├── agent/            # AI agents (A1, etc.)
│   ├── tool/             # Scientific tools
│   ├── model/            # ML models
│   └── ...
├── config/               # Configuration
│   ├── .env.example     # Environment template
│   └── models.md        # Model configurations
└── docs/                # Documentation
```

## API Endpoints

### Health Check
```
GET /health
```

### Execute Query (SSE)
```
GET /stream?q={query}&session_id={session_id}
```

Streams events:
- `reasoning`: Planning and reasoning steps
- `tool_call`: Tool execution
- `ai_message`: Agent responses
- `final_answer`: Complete solution
- `error`: Error messages

### Example Usage

```javascript
const eventSource = new EventSource(
  `http://localhost:8000/stream?q=${encodeURIComponent(query)}&session_id=${sessionId}`
);

eventSource.addEventListener('ai_message', (event) => {
  const data = JSON.parse(event.data);
  console.log('AI Response:', data.content);
});

eventSource.addEventListener('final_answer', (event) => {
  const data = JSON.parse(event.data);
  console.log('Solution:', data.content);
});
```

## Available Tools

The Biomni agent has access to 100+ tools across domains:

### Molecular Biology
- DNA/RNA sequence analysis
- Protein structure prediction
- Cloning and vector design
- CRISPR guide design

### Genomics
- Variant analysis
- Gene expression analysis
- Pathway enrichment
- GWAS analysis

### Drug Discovery
- Molecular docking
- ADMET prediction
- Target identification
- Lead optimization

### Data Analysis
- Statistical analysis
- Visualization
- Machine learning
- Data processing

## Configuration

### Model Selection

Edit `config/models.md` or set in `.env`:

```env
DEFAULT_MODEL=gpt-4  # or gpt-3.5-turbo, deepseek-chat, etc.
```

### Tool Configuration

Enable/disable tool categories in `.env`:

```env
ENABLE_ALL_TOOLS=true
# Or specific categories
ENABLE_MOLECULAR_BIOLOGY=true
ENABLE_GENOMICS=true
```

## Development

### Adding New Tools

1. Create tool in `biomni/tool/{domain}.py`
2. Add description in `biomni/tool/tool_description/{domain}.py`
3. Register in tool system

### Testing

```bash
pytest tests/
```

### Debugging

Set log level in `.env`:
```env
LOG_LEVEL=DEBUG
```

## Docker Support

```bash
docker build -t biomni-backend .
docker run -p 8000:8000 --env-file config/.env biomni-backend
```

## Troubleshooting

### Common Issues

1. **Import errors**: Install all requirements
2. **API key errors**: Check `.env` configuration
3. **Port already in use**: Change `SERVER_PORT` in `.env`
4. **CORS errors**: Add frontend URL to `CORS_ORIGINS`

### Windows Specific

- Encoding issues are handled automatically
- Use PowerShell or Git Bash for best results

## License

See LICENSE file in root directory.

## Support

For issues or questions:
- Create an issue on GitHub
- Contact: rajiblohia@gmail.com