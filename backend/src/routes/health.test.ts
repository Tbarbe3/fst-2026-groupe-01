import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { healthRoutes } from './health.js'

async function buildTestApp() {
  const app = Fastify()
  await app.register(healthRoutes, { prefix: '/api' })
  return app
}

describe('GET /api/health', () => {
  it('répond 200 avec un statut ok', async () => {
    const app = await buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ok' })
    await app.close()
  })

  // Le healthcheck de docker-compose dépend de ce format : un changement de
  // nom de champ casserait le démarrage du conteneur sans erreur explicite.
  it('expose uptime et horodatage', async () => {
    const app = await buildTestApp()
    const body = (await app.inject({ method: 'GET', url: '/api/health' })).json()

    expect(typeof body.uptime).toBe('number')
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
    await app.close()
  })
})
