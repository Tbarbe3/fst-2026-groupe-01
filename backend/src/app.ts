import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'

// Extension .js aux imports locaux : c'est ce que Node résout après
// compilation, `tsc` ne réécrit pas les chemins.
import { createGeminiProvider, createMockProvider } from './ai/provider.js'
import { auth } from './auth.js'
import { env, isProduction } from './config/env.js'
import { AUTH_RATE_LIMIT } from './config/rate-limit.js'
import { createChallengesRepo } from './db/challenges-repo.js'
import { runMigrations } from './db/migrate.js'
import { pool } from './db/pool.js'
import { createErrorHandler } from './error-handler.js'
import { challengesRoutes } from './routes/challenges.js'
import { healthRoutes } from './routes/health.js'

/**
 * Construit l'instance sans la démarrer : les tests peuvent ainsi la monter
 * en mémoire avec `app.inject()`, sans ouvrir de port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isProduction
      ? true
      : { transport: { target: 'pino-pretty', options: { colorize: true } } },
    // Sans trustProxy, X-Forwarded-* est ignoré et `request.protocol` vaut
    // « http » derrière Traefik. Faire confiance à tous les proxys est sûr :
    // seul Traefik joint ce conteneur.
    trustProxy: isProduction,
    // 64 Kio suffisent largement à un formulaire d'authentification. La
    // valeur par défaut de Fastify est 1 Mio, soit autant de mémoire qu'un
    // client peut faire allouer par requête.
    bodyLimit: 64 * 1024,
  })

  app.setErrorHandler(createErrorHandler(isProduction))

  await app.register(helmet)
  await app.register(cors, { origin: env.corsOrigin, credentials: true })
  // Enregistré sans plafond global : seules les routes qui déclarent un
  // `config.rateLimit` sont limitées.
  await app.register(rateLimit, { global: false })

  // Avant d'ouvrir les routes : un schéma absent doit faire échouer le
  // démarrage, pas la première requête.
  await runMigrations(app.log)

  await app.register(healthRoutes, { prefix: '/api' })

  const ai =
    env.aiMode === 'gemini'
      ? createGeminiProvider({
          apiKey: env.geminiApiKey,
          generatorModel: env.geminiGeneratorModel,
          judgeModel: env.geminiJudgeModel,
        })
      : createMockProvider(env.mockLatencyMs)
  app.log.info({ mode: ai.name }, 'Brique IA')

  await app.register(challengesRoutes, {
    prefix: '/api',
    repo: createChallengesRepo(pool),
    ai,
    getUserId: async (request) => {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
      return session?.user.id ?? null
    },
  })

  app.all('/api/auth/*', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    // Schéma déduit de X-Forwarded-Proto et non codé en dur : Better Auth
    // compare cette URL à sa baseURL et rejetterait une origine incohérente.
    const url = new URL(request.url, `${request.protocol}://${request.host}`)
    const headers = fromNodeHeaders(request.headers)
    // Le corps est reconstruit juste après : un Content-Length copié de la
    // requête d'origine ne correspond plus à ce nouveau corps.
    headers.delete('content-length')

    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      ...(request.body && request.method !== 'GET'
        ? { body: JSON.stringify(request.body) }
        : {}),
    })

    const response = await auth.handler(req)

    reply.status(response.status)
    response.headers.forEach((value, key) => {
      // Ne pas copier le content-length car Fastify le recalculera
      if (key.toLowerCase() !== 'content-length') {
        reply.header(key, value)
      }
    })

    const text = await response.text()
    
    // Si better-auth renvoie un corps vide, on s'assure que le navigateur 
    // ne va pas essayer de le parser comme du JSON en retirant l'en-tête.
    if (!text) {
      reply.removeHeader('content-type')
      return reply.send()
    }

    // Texte brut : reply.send(null) produirait un corps vide, et non la chaîne "null" attendue.
    return reply.send(text)
  })

  return app
}
