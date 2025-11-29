import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to set COOP headers for Firebase Auth popup support
const coopHeadersPlugin = () => {
  return {
    name: 'coop-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')
        res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')
        res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), coopHeadersPlugin()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
})
