import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, 
  },
  server: {
    port: 5173,
    open: true,
    // En dev, /api est relayé vers le backend Fastify : le front n'a jamais
    // besoin de connaître son URL absolue, et on évite le CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})