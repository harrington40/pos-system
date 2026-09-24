import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../../public/dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      // NestJS API (new backend)
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // PHP REST API (legacy, during migration)
      '/apis': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // OAuth2 (still handled by PHP)
      '/oauth2': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // Legacy PHP UI
      '/interface': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/portal': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
})
