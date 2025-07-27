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
    port: 9000,
    proxy: {
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 600000, // 10 minutes instead of default 2 minutes
      },
      '/ws': {
        target: 'ws://localhost:7000',
        ws: true,
        changeOrigin: true,
        timeout: 600000, // 10 minutes
      },
    },
  },
})