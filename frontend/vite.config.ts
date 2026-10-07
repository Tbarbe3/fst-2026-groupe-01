import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Sans source maps, une erreur en prod ne donne qu'une pile minifiée
    // (`at an (index-abc123.js:11:30814)`), indéchiffrable. Contrepartie :
    // les fichiers .map sont servis publiquement, donc le code source du
    // front est lisible — ce qui est déjà le cas du bundle lui-même.
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
    // Relais vers Fastify : le front appelle /api en relatif, comme en prod
    // derrière Traefik, ce qui évite toute URL absolue et tout CORS.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})