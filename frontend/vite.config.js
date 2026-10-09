import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Allow up to 60s for compute-heavy benchmark/sweep endpoints
        proxyTimeout: 60000,
        timeout: 60000,
      }
    }
  }
})
