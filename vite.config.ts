import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',  // AIDEV-NOTE: Host on 0.0.0.0 for external access
    port: 3000,
    strictPort: false,
    // AIDEV-NOTE: Proxy configuration for Biomni bridge integration
    // Routes /api requests to local Biomni bridge server instead of Railway
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // AIDEV-NOTE: Point to local Biomni bridge server
        changeOrigin: true,
        secure: false,  // AIDEV-NOTE: Local HTTP, not HTTPS
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 600000, // 10 minutes for long Biomni workflows
      },
      // AIDEV-NOTE: Keep WebSocket proxy for other features if needed
      '/ws': {
        target: 'ws://localhost:8000',  // AIDEV-NOTE: Local WebSocket if needed
        ws: true,
        changeOrigin: true,
        secure: false,
        timeout: 600000,
      },
    },
  },
})