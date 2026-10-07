import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyInstance } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'

// Extension .js aux imports locaux : c'est ce que Node résout après
// compilation, `tsc` ne réécrit pas les chemins.
import { auth } from './auth.js'
import { env, isProduction } from './config/env.js'
import { runMigrations } from './db/migrate.js'
import { healthRoutes } from './routes/health.js'
import { userRoutes } from './routes/users.js'

/**
 * Construit l'instance sans la démarrer : les tests peuvent ainsi la monter
 * en mémoire avec `app.inject()`, sans ouvrir de port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isProduction
      ? true
      : { transport: { target: 'pino-pretty', options: { colorize: true } } },
    // Traefik transmet la requête en HTTP clair ; sans trustProxy, les
    // en-têtes X-Forwarded-* sont ignorés et `request.protocol` vaut « http ».
    // Faire confiance à tous les proxys est acceptable : seul Traefik peut
    // joindre ce conteneur sur le réseau `web`.
    trustProxy: isProduction,
  })

  await app.register(helmet)
  await app.register(cors, { origin: env.corsOrigin, credentials: true })

  // Avant d'ouvrir les routes : un schéma absent doit faire échouer le
  // démarrage, pas la première requête.
  await runMigrations(app.log)

  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(userRoutes, { prefix: '/api' })

  app.all('/api/auth/*', async (request, reply) => {
    // Schéma déduit de X-Forwarded-Proto et non codé en dur : Better Auth
    // compare cette URL à sa baseURL et rejetterait une origine incohérente.
    const url = new URL(request.url, `${request.protocol}://${request.host}`)
    const headers = fromNodeHeaders(request.headers)

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

    // On renvoie le texte brut. Si c'est "null", Fastify enverra bien la chaîne "null" 
    // qui sera parsée en `null` valide côté client.
    // Cela évite que reply.send(null) ne génère un corps totalement vide.
    return reply.send(text)
  })

  return app
}
