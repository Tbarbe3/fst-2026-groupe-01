import pg from 'pg'

import { env } from '../config/env.js'

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  // Échouer vite plutôt que de retenir une connexion du pool jusqu'au
  // timeout du client HTTP.
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 10,
})

export async function closePool(): Promise<void> {
  await pool.end()
}
