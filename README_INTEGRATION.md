# Biomni + BioAgent Integration

This branch contains the integrated version of two biomedical AI agents:
1. **BioAgent** - Literature search and research agent
2. **Biomni** - General biomedical AI analysis agent

## Structure

```
/
├── src/                    # BioAgent (Research Agent) source code
├── biomni-app/            # Biomni (Analysis Agent) complete app
├── agent-selector.html    # Landing page for agent selection
└── .env.example          # Configuration example
```

## Quick Start

### 1. Install Dependencies

```bash
# Install BioAgent dependencies
npm install

# Install Biomni dependencies
cd biomni-app
npm install
cd ..
```

### 2. Configure Environment

```bash
# Copy and configure BioAgent .env
cp .env.example .env
# Edit .env and set VITE_ACCESS_PIN=9898

# Configure Biomni .env
cd biomni-app
cp .env.example .env
# Edit as needed
cd ..
```

### 3. Run Both Apps

Open two terminals:

**Terminal 1 - BioAgent (Research Agent):**
```bash
npm run dev
# Runs on http://localhost:9000
```

**Terminal 2 - Biomni (Analysis Agent):**
```bash
cd biomni-app
npm run dev
# Runs on http://localhost:5173
```

### 4. Access the Apps

1. Open `agent-selector.html` in your browser
2. Choose between:
   - **Research Agent** - Literature search (PIN: 9898)
   - **Analysis Agent** - General biomedical AI tasks

## Features

### Research Agent (BioAgent)
- Real-time literature search
- WebSocket streaming
- Beautiful paper display
- Conversation history
- PIN: 9898 for authentication

### Analysis Agent (Biomni)
- General biomedical AI tasks
- Protocol execution
- Multi-tool orchestration
- Image generation support
- Dual rendering (JSON/Markdown)

## Navigation

Both apps have integrated navigation:
- Click "Analysis Agent" button to switch to Biomni
- Click "Research Agent" button to switch to BioAgent

## Ports

- **BioAgent**: http://localhost:9000
- **Biomni**: http://localhost:5173
- **Backend** (if needed): http://localhost:8000

## Development

### Modifying BioAgent
Edit files in the root `src/` directory

### Modifying Biomni
Edit files in the `biomni-app/src/` directory

## Deployment

Both apps can be built and deployed separately:

```bash
# Build BioAgent
npm run build

# Build Biomni
cd biomni-app
npm run build
```

## Contributors

- Jayluci4 (rajiblohia@gmail.com)

## License

See individual app licenses.