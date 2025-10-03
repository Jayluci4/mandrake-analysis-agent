# Mandrake Analysis Agent

A powerful biomedical AI analysis agent with Google OAuth authentication, built with React, TypeScript, and integrated with advanced AI backend services.

## Features

### 🔐 Authentication
- Google OAuth 2.0 integration for secure access
- Profile photo rendering with fallback mechanisms
- Session persistence with localStorage

### 🧬 Biomedical Analysis
- Real-time AI-powered biomedical analysis
- Integration with advanced backend for research capabilities
- Support for multiple AI models (GPT-4, Claude Sonnet 4)

### 📁 File Management
- Upload and manage biomedical data files
- Support for various formats (FASTA, FASTQ, PDB, etc.)
- S3 integration for file storage

### 💬 Conversation Interface
- Real-time chat with AI agent
- Conversation history with search functionality
- Todo list and execution log tracking
- Glass morphism UI design

### 🔬 Specialized Services
- Drug discovery analysis
- Literature intelligence
- Protein structure analysis
- Research intelligence

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **@react-oauth/google** for Google authentication

### Backend
- **Python** with FastAPI/Flask
- **SSE (Server-Sent Events)** for real-time communication
- **SQLite** for conversation storage
- **AWS S3** for file storage
- **Mandrake Analysis Engine** for AI analysis

## Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Google Cloud Console project with OAuth 2.0 credentials
- AWS credentials (for S3 file storage)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Backend URLs
VITE_ANALYSIS_API_URL=http://localhost:8000
VITE_MANDRAKE_API_URL=http://localhost:8000

# Optional - Development
VITE_DEV_MODE=true
```

Create a `backend/.env` file:

```env
# Azure OpenAI (Primary)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=your-endpoint
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# AWS Bedrock (Fallback)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BEDROCK_REGION=us-east-1

# S3 Configuration
MY_S3_BUCKET_NAME=your-bucket
MY_S3_BUCKET_URL=your-bucket-url

# Mandrake Configuration
MANDRAKE_LLM=azure-gpt-4.1
MANDRAKE_SOURCE=AzureOpenAI
MANDRAKE_FALLBACK_LLM=us.anthropic.claude-sonnet-4-20250514-v1:0
MANDRAKE_FALLBACK_SOURCE=Bedrock
```

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Jayluci4/mandrake-analysis-agent.git
cd mandrake-analysis-agent
```

2. **Install frontend dependencies:**
```bash
npm install
```

3. **Install backend dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

### Running the Application

1. **Start the backend server:**
```bash
cd backend
python server.py
```
The backend will run on http://localhost:8000

2. **Start the frontend development server:**
```bash
npm run dev
```
The frontend will run on http://localhost:3000

3. **Access the application:**
Open http://localhost:3000 in your browser

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - http://localhost:3000
   - http://localhost:3001
   - http://localhost:3002
   - Your production domain

## Project Structure

```
mandrake-analysis-agent/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── context/           # Context providers (Google Auth)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   └── App.tsx            # Main application component
├── backend/               # Backend server code
│   ├── server.py          # Main server
│   ├── bridge_server.py   # AI service bridge
│   └── ...               # Other service modules
├── public/                # Static assets
├── package.json           # Frontend dependencies
└── vite.config.ts        # Vite configuration
```

## Key Components

### Frontend
- **MandrakeAnalysisAgent.tsx**: Main analysis agent page
- **GoogleAuthContext.tsx**: Google OAuth context provider
- **GoogleLogin.tsx**: Login button with profile display
- **FileManager.tsx**: File upload and management
- **ConversationHistory.tsx**: Chat history display
- **MessageBubble.tsx**: Message rendering component

### Backend
- **server.py**: Main backend server with SSE endpoints
- **drug_discovery_api.py**: Drug discovery analysis endpoints
- **literature_intelligence.py**: Literature search and analysis
- **protein_structure_service.py**: Protein structure analysis
- **s3_file_service.py**: S3 file management

## Testing

### OAuth Test Page
Navigate to `/test-auth` to access the Google OAuth debugging page:
- Test authentication flow
- Run diagnostics
- View troubleshooting guide

## Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
```
Deploy the `dist` folder to your hosting service.

### Backend (Cloud Run/EC2)
1. Dockerize the backend application
2. Deploy to your cloud service
3. Update frontend environment variables with production URLs

## Troubleshooting

### 403 Error on Google OAuth
1. Check authorized JavaScript origins in Google Cloud Console
2. Ensure the current domain is added to authorized origins
3. Wait 5-10 minutes for changes to propagate
4. Clear browser cache

### Connection Errors
1. Verify backend is running on correct port
2. Check CORS configuration
3. Ensure environment variables are set correctly

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For issues and questions, please open an issue on GitHub or contact the development team.

## Acknowledgments

- Powered by advanced AI models including GPT-4 and Claude Sonnet
- Uses Google OAuth for secure authentication
- Built with cutting-edge biomedical analysis capabilities