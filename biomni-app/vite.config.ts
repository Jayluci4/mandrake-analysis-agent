import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: "postcss", // force PostCSS instead of lightningcss
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy API requests to A1 agent backend with SSE support
      '/api': {
        target: 'http://localhost:8001', // A1 agent server
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxy
        timeout: 300000, // 5 minute timeout for long SSE streams
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Set headers for SSE
            if (req.headers.accept?.includes('text/event-stream')) {
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Connection', 'keep-alive');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            // Set SSE headers for event-stream responses
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['connection'] = 'keep-alive';
              proxyRes.headers['access-control-allow-origin'] = '*';
            }
          });
        },
      },
      // Proxy health check to A1 agent
      '/health': {
        target: 'http://localhost:8001', // A1 agent server
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 4173,
    host: true,
  }
})
