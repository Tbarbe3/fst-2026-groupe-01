import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
    // Le pool `forks` par défaut expire sous Windows quand le chemin du
    // projet contient une espace (« Prog Web »). Les threads partagent le
    // même processus et démarrent aussi beaucoup plus vite avec jsdom.
    pool: 'threads',
  },
})
