import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Get backend URL from environment or use default
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3301'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    outDir: '../../../dist/web',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'], // Exclude packages that have source map issues
  },
  server: {
    port: parseInt(process.env.VITE_FRONTEND_PORT || '5173'),
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendUrl,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})