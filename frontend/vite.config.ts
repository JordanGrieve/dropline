import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the Spring Boot backend runs on 8080. The page is served
// from the same origin in production, so these proxies keep dev identical:
// no CORS, and the WebSocket connects to the host the page came from.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/..." is what Magic UI and shadcn components import from.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
