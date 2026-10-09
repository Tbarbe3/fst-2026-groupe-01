import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { createErrorHandler } from './error-handler.js'

async function buildTestApp(isProduction: boolean) {
  const app = Fastify({ logger: false })
  app.setErrorHandler(createErrorHandler(isProduction))

  app.get('/boom', async () => {
    // Imite une erreur PostgreSQL : son message porte un fragment de requête
    // et un nom de colonne, qui ne doivent pas atteindre le navigateur.
    throw new Error(
      'relation "user" column "password_hash" does not exist at character 42',
    )
  })

  app.get('/refuse', async (_request, reply) => {
    return reply.status(429).send({ message: 'Trop de requêtes' })
  })

  return app
}

describe('gestionnaire d’erreurs', () => {
  it("ne divulgue aucun détail interne en production", async () => {
    const app = await buildTestApp(true)
    const response = await app.inject({ method: 'GET', url: '/boom' })

    expect(response.statusCode).toBe(500)
    const body = response.json()
    expect(body.message).toBe('Une erreur interne est survenue.')
    expect(response.payload).not.toContain('password_hash')
    expect(response.payload).not.toContain('relation')
    await app.close()
  })

  it('conserve le message en développement pour le débogage', async () => {
    const app = await buildTestApp(false)
    const response = await app.inject({ method: 'GET', url: '/boom' })

    expect(response.statusCode).toBe(500)
    expect(response.json().message).toContain('password_hash')
    await app.close()
  })

  it('laisse passer les réponses 4xx légitimes', async () => {
    const app = await buildTestApp(true)
    const response = await app.inject({ method: 'GET', url: '/refuse' })

    expect(response.statusCode).toBe(429)
    await app.close()
  })
})

describe('limite de taille du corps', () => {
  it('refuse un corps au-delà du plafond', async () => {
    const app = Fastify({ logger: false, bodyLimit: 64 * 1024 })
    app.setErrorHandler(createErrorHandler(true))
    app.post('/echo', async () => ({ ok: true }))

    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ x: 'a'.repeat(70 * 1024) }),
    })

    expect(response.statusCode).toBe(413)
    await app.close()
  })
})
