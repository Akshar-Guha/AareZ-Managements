import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  
  return {
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
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction,
      // Optimize bundle size
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@headlessui/react', '@heroicons/react', 'clsx', 'sonner'],
            charts: ['chart.js']
          }
        }
      }
    },
    // Important for SPA routing in production
    preview: {
      port: 5173,
      strictPort: true,
      host: true,
      // Handle SPA routing
      proxy: {
        '/api': {
          target: 'http://localhost:3100',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
