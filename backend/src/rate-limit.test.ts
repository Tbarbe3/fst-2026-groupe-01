import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { AUTH_RATE_LIMIT } from './config/rate-limit.js'

// Reproduit `app.ts` sans la base, que `buildApp` exigerait. Une limitation
// mal configurée n'échoue pas : elle laisse tout passer, d'où ce test qui
// vérifie que le plafond mord réellement.
async function buildTestApp() {
  const app = Fastify()
  await app.register(rateLimit, { global: false })
  app.all(
    '/api/auth/*',
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async () => ({ ok: true }),
  )
  app.get('/api/health', async () => ({ ok: true }))
  return app
}

const hit = (app: Awaited<ReturnType<typeof buildTestApp>>, url: string) =>
  app.inject({ method: 'POST', url, remoteAddress: '203.0.113.7' })

describe('limitation de débit sur /api/auth', () => {
  it('bloque au-delà du plafond avec un code 429', async () => {
    const app = await buildTestApp()
    const max = AUTH_RATE_LIMIT.max

    const codes: number[] = []
    for (let i = 0; i < max + 3; i += 1) {
      codes.push((await hit(app, '/api/auth/sign-in/email')).statusCode)
    }

    expect(codes.filter((c) => c === 200)).toHaveLength(max)
    expect(codes.filter((c) => c === 429)).toHaveLength(3)
    await app.close()
  })

  it('compte séparément chaque adresse IP', async () => {
    const app = await buildTestApp()

    for (let i = 0; i < AUTH_RATE_LIMIT.max; i += 1) {
      await hit(app, '/api/auth/sign-in/email')
    }

    const autre = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      remoteAddress: '198.51.100.9',
    })
    expect(autre.statusCode).toBe(200)
    await app.close()
  })

  it('ne limite pas les routes hors authentification', async () => {
    const app = await buildTestApp()

    for (let i = 0; i < AUTH_RATE_LIMIT.max + 5; i += 1) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
        remoteAddress: '203.0.113.7',
      })
      expect(response.statusCode).toBe(200)
    }
    await app.close()
  })
})
