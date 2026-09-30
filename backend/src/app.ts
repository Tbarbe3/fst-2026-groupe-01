import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyInstance } from 'fastify'

// Extension .js obligatoire à l'import : c'est ce que Node résout après
// compilation, `tsc` ne réécrit pas les chemins.
import { env, isProduction } from './config/env.js'
import { healthRoutes } from './routes/health.js'

/**
 * Construit l'instance Fastify sans la démarrer.
 * Séparer `buildApp` de `server.ts` permet de monter l'app en mémoire
 * dans les tests (`app.inject()`) sans ouvrir de port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isProduction
      ? true
      : { transport: { target: 'pino-pretty', options: { colorize: true } } },
  })

  await app.register(helmet)
  await app.register(cors, { origin: env.corsOrigin, credentials: true })

  // Toute l'API est préfixée par /api : c'est ce que le proxy Vite relaie
  // en dev et ce que Nginx route vers ce conteneur en prod.
  await app.register(healthRoutes, { prefix: '/api' })

  return app
}
