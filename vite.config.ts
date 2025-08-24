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
    port: 3000,
    strictPort: false,
    // Proxy is only used for local development
    // In production, use environment variables to point to the actual backend
    proxy: {
      '/api': {
        target: 'https://web-production-40da3.up.railway.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 600000, // 10 minutes instead of default 2 minutes
      },
      '/ws': {
        target: 'wss://web-production-40da3.up.railway.app',
        ws: true,
        changeOrigin: true,
        secure: true,
        timeout: 600000, // 10 minutes
      },
    },
  },
})