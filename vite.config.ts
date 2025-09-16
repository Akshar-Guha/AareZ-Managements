import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5174',
          changeOrigin: true,
          // Preserve the /api prefix so backend routes defined with /api/... match correctly
          // (previously the proxy stripped /api which caused unmatched routes)
          rewrite: (path) => path
        }
      }
    },
    base: '/',
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    build: {
      outDir: 'dist'
    }
  };
});
