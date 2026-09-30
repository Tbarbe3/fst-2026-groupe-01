import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyInstance } from 'fastify'

// Extension .js obligatoire à l'import : c'est ce que Node résout après
// compilation, `tsc` ne réécrit pas les chemins.
import { env, isProduction } from './config/env.js'
import { runMigrations } from './db/migrate.js'
import { healthRoutes } from './routes/health.js'
import { userRoutes } from './routes/users.js'

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

  if (!env.geminiApiKey) {
    app.log.warn(
      'GEMINI_API_KEY absente : les routes de la brique IA échoueront.',
    )
  }

  await app.register(helmet)
  await app.register(cors, { origin: env.corsOrigin, credentials: true })

  // Avant d'ouvrir les routes : si le schéma n'est pas en place, autant
  // échouer au démarrage plutôt que sur la première requête.
  await runMigrations(app.log)

  // Toute l'API est préfixée par /api : c'est ce que le proxy Vite relaie
  // en dev et ce que Nginx route vers ce conteneur en prod.
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(userRoutes, { prefix: '/api' })

  return app
}
