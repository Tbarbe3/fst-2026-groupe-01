import { buildApp } from './app.js'
import { env } from './config/env.js'
import { closePool } from './db/pool.js'

const app = await buildApp()

// Sans cet arrêt propre, `docker compose down` coupe les requêtes en cours
// et laisse des connexions PostgreSQL ouvertes côté serveur.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} reçu, arrêt du serveur`)
    await app.close()
    await closePool()
    process.exit(0)
  })
}

try {
  await app.listen({ host: env.host, port: env.port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
