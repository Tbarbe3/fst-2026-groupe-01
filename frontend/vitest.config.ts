import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Le pool `forks` par défaut expire sous Windows quand le chemin du
    // projet contient une espace (« Prog Web »). Les threads partagent le
    // même processus et démarrent aussi beaucoup plus vite avec jsdom.
    pool: 'threads',
  },
})
