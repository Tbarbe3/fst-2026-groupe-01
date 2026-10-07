import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Comme côté frontend : le pool `forks` expire sous Windows quand le
    // chemin du projet contient une espace.
    pool: 'threads',
  },
})
