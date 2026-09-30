import pg from 'pg'

import { env } from '../config/env.js'

/**
 * Pool de connexions PostgreSQL, partagé par toute l'application.
 *
 * En production, `DATABASE_URL` pointe sur `postgres:5432` : le conteneur
 * de l'API et celui de la base partagent le réseau Docker `internal` et se
 * joignent par leur nom de service. En développement, l'URL pointe sur
 * `localhost:5432`, c'est-à-dire l'entrée du tunnel SSH.
 */
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  // Une requête qui ne répond pas doit échouer vite plutôt que de retenir
  // une connexion du pool jusqu'au timeout du client HTTP.
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 10,
})

/** Ferme le pool à l'arrêt du serveur, pour ne pas laisser de connexions ouvertes. */
export async function closePool(): Promise<void> {
  await pool.end()
}
