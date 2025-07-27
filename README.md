# BioAgent Frontend

A beautiful, modern frontend for the AI Co-Scientist system built with React, TypeScript, and Tailwind CSS.

## Features

- 🧬 Beautiful dark theme optimized for scientific research
- 🔬 Real-time search with WebSocket updates
- 📚 Elegant paper display with expandable abstracts
- 🎨 Glass-morphism design with smooth animations
- 🚀 Fast and responsive with Vite
- 📱 Fully responsive design

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BioAgentFrontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your backend URL:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:6000`

### Building for Production

1. Build the project:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

### Deployment

The built files will be in the `dist` directory. You can deploy these to any static hosting service:

#### Vercel
```bash
npm i -g vercel
vercel
```

#### Netlify
1. Build the project
2. Drag and drop the `dist` folder to Netlify

#### GitHub Pages
1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
"scripts": {
  "deploy": "gh-pages -d dist"
}
```

3. Deploy:
```bash
npm run build
npm run deploy
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if backend is on different server)
    location /api {
        proxy_pass http://backend-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## Environment Variables

- `VITE_API_URL`: Backend API URL (default: `http://localhost:8000`)
- `VITE_WS_URL`: WebSocket URL (default: `ws://localhost:8000/ws`)

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Query** - Server state management
- **Socket.io** - WebSocket client
- **Zustand** - Client state management

## License

MIT