import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/TrustHuntEnt/',
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: false,
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'static/[name].[hash].js',
        chunkFileNames: 'static/[name].[hash].js',
        assetFileNames: 'static/[name].[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react']
        }
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
});