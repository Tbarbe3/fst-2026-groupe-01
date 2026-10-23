import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Comme côté frontend : le pool `forks` expire sous Windows quand le
    // chemin du projet contient une espace.
    pool: 'threads',
    // Monter l'app Fastify (Better Auth compris) dépasse parfois 5 s sur une machine chargée.
    testTimeout: 15_000,
  },
})
