import Fastify from 'fastify'
import type { Pool } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { authResetRoutes } from './auth-reset.js'

function fakePool(rows: Array<{ id: string; email: string }> = []): Pool {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT')) {
        return { rows }
      }
      return { rows: [] }
    }),
  } as unknown as Pool
}

async function buildApp(pool: Pool) {
  const app = Fastify()
  await app.register(authResetRoutes, { prefix: '/api', pool })
  return app
}

describe('POST /api/auth/forgot-password', () => {
  it('rejette une requête avec un e-mail manquant ou invalide', async () => {
    const app = await buildApp(fakePool())
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('ne divulgue pas si le compte existe quand l’adresse est inconnue', async () => {
    const pool = fakePool([])
    const app = await buildApp(pool)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'inconnu@exemple.fr' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.resetToken).toBeUndefined()
    expect(body.resetUrl).toBeUndefined()
    await app.close()
  })

  it('génère un jeton et l’insère dans verification si le compte existe', async () => {
    const pool = fakePool([{ id: 'user-123', email: 'joueur@exemple.fr' }])
    const app = await buildApp(pool)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'joueur@exemple.fr' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(typeof body.resetToken).toBe('string')
    expect(body.resetUrl).toBe(`/reset-password?token=${body.resetToken}`)

    // Vérifie l'insertion dans la table verification
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "verification"'),
      expect.arrayContaining([
        expect.stringContaining(`reset-password:${body.resetToken}`),
        'user-123',
      ]),
    )

    await app.close()
  })
})

