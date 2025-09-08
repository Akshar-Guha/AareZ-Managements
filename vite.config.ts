import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // This makes it accessible on your network IP
    port: 5173, // Ensure this matches your application's port if it's different
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
