import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/TrustHuntEnt/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
    port: 3000,
    host: true,
    strictPort: false
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
});