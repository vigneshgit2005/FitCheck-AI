import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Build directly into the backend's static folder
  // FastAPI will serve this at http://localhost:8000/
  build: {
    outDir: path.resolve(__dirname, '../backend/static/dist'),
    emptyOutDir: true,
  },
  // Dev mode only: proxy API calls to uvicorn
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
