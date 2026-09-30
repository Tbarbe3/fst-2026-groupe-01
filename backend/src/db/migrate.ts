import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { FastifyBaseLogger } from 'fastify'

import { pool } from './pool.js'

// Depuis dist/db/, les fichiers SQL sont deux niveaux plus haut. Ils ne
// sont pas compilés, le Dockerfile les copie tels quels à côté de dist/.
const SQL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sql')

/**
 * Applique les fichiers de `sql/` dans l'ordre alphabétique, au démarrage.
 *
 * Solution provisoire en attendant l'ORM et ses migrations : chaque fichier
 * doit rester idempotent, il est rejoué à chaque boot. C'est suffisant pour
 * créer un schéma, pas pour le faire évoluer — une colonne renommée
 * demandera un vrai outil de migration.
 */
export async function runMigrations(log: FastifyBaseLogger): Promise<void> {
  const files = (await readdir(SQL_DIR)).filter((f) => f.endsWith('.sql')).sort()

  if (files.length === 0) {
    log.warn({ dir: SQL_DIR }, 'Aucun fichier SQL trouvé')
    return
  }

  for (const file of files) {
    const sql = await readFile(join(SQL_DIR, file), 'utf8')
    // Une transaction par fichier : un fichier à moitié appliqué laisserait
    // un schéma dans un état qu'aucun rejeu ne rattraperait.
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      log.info({ file }, 'Migration appliquée')
    } catch (error) {
      await client.query('ROLLBACK')
      log.error({ file, error }, 'Échec de la migration')
      throw error
    } finally {
      client.release()
    }
  }
}
