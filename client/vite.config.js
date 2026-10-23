import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// All /api calls are forwarded to the Express backend, so the browser sees one origin
// (no CORS problems and the login cookie just works).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
