import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BASE = {
  DATABASE_URL: 'postgresql://codehow:secret@127.0.0.1:5432/codehow',
}

// `env.ts` lit process.env et lève au chargement : chaque cas réimporte
// donc le module avec un environnement neuf, d'où `resetModules`.
async function loadEnv(overrides: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries({ ...BASE, ...overrides })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return import('./env.js')
}

describe('env', () => {
  const original = { ...process.env }

  beforeEach(() => {
    for (const key of [
      'NODE_ENV',
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'CORS_ORIGIN',
      'PORT',
      'HOST',
      'AI_MODE',
      'GEMINI_API_KEY',
    ]) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('échoue si DATABASE_URL manque', async () => {
    await expect(loadEnv({ DATABASE_URL: undefined })).rejects.toThrow(
      /DATABASE_URL/,
    )
  })

  it('applique les valeurs par défaut du développement', async () => {
    const { env, isProduction } = await loadEnv({})
    expect(isProduction).toBe(false)
    expect(env.port).toBe(3000)
    expect(env.corsOrigin).toBe('http://localhost:5173')
    expect(env.betterAuthUrl).toBe('http://localhost:3000')
  })

  it('démarre en développement sans secret ni HTTPS', async () => {
    await expect(loadEnv({ NODE_ENV: 'development' })).resolves.toBeDefined()
  })

  // Garde-fou de sécurité : un secret par défaut rend les cookies de session
  // falsifiables, mieux vaut refuser de démarrer que de servir ainsi.
  it('refuse de démarrer en production sans BETTER_AUTH_SECRET', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://codehow.exemple.fr',
      }),
    ).rejects.toThrow(/BETTER_AUTH_SECRET/)
  })

  it('refuse une BETTER_AUTH_URL en HTTP en production', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'a'.repeat(64),
        BETTER_AUTH_URL: 'http://codehow.exemple.fr',
      }),
    ).rejects.toThrow(/BETTER_AUTH_URL/)
  })

  it('accepte une configuration de production complète', async () => {
    const { env, isProduction } = await loadEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'a'.repeat(64),
      BETTER_AUTH_URL: 'https://codehow.exemple.fr',
    })
    expect(isProduction).toBe(true)
    expect(env.betterAuthUrl).toBe('https://codehow.exemple.fr')
  })

  it('passe en mode simulé sans clé Gemini', async () => {
    const { env } = await loadEnv({})
    expect(env.aiMode).toBe('mock')
  })

  it('passe en mode Gemini dès qu’une clé est fournie', async () => {
    const { env } = await loadEnv({ GEMINI_API_KEY: 'cle' })
    expect(env.aiMode).toBe('gemini')
  })

  it('refuse AI_MODE=gemini sans clé', async () => {
    await expect(loadEnv({ AI_MODE: 'gemini' })).rejects.toThrow(/GEMINI_API_KEY/)
  })

  it('refuse une valeur inconnue de AI_MODE', async () => {
    await expect(loadEnv({ AI_MODE: 'openai' })).rejects.toThrow(/AI_MODE/)
  })
})
