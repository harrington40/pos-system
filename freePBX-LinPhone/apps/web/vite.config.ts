import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@smart-sip/shared': resolve(__dirname, '../../packages/shared/src'),
      '@smart-sip/sip-core': resolve(__dirname, '../../packages/sip-core/src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  }
});
