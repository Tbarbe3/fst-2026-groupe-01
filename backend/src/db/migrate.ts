import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { FastifyBaseLogger } from 'fastify'

import { isProduction } from '../config/env.js'
import { pool } from './pool.js'

/**
 * `AggregateError`, ce que lève pg quand toutes les adresses résolues
 * échouent, a un `message` vide : tout est dans `code` et dans `errors`.
 * S'en tenir à `error.message` afficherait « Base injoignable () ».
 */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error)

  const code = (error as NodeJS.ErrnoException).code
  if (error.message) return code ? `${code} — ${error.message}` : error.message
  return code ?? error.name
}

/**
 * Teste la connexion avant toute migration.
 *
 * Sans ça, une base injoignable en développement produit un ECONNREFUSED
 * brut, l'API s'arrête, et le navigateur n'affiche qu'un 502 renvoyé par le
 * proxy Vite — symptôme très éloigné de la cause.
 */
async function assertDatabaseReachable(log: FastifyBaseLogger): Promise<void> {
  try {
    const client = await pool.connect()
    client.release()
  } catch (error) {
    log.error(
      isProduction
        ? `Base injoignable (${describe(error)}). Vérifier que le service postgres est démarré et que DATABASE_URL pointe sur l'hôte « postgres ».`
        : `Base injoignable (${describe(error)}).\n` +
            "  L'équipe partage la base du VPS : ouvrir le tunnel dans un autre terminal,\n" +
            '  en remplaçant <vps> par un domaine qui pointe sur le serveur\n' +
            '  (celui du site, par exemple) :\n' +
            '    ssh -N -L 5432:127.0.0.1:5432 dbtunnel@<vps>\n' +
            '  ou démarrer une base locale jetable :\n' +
            '    docker compose --profile dev up -d\n' +
            '  puis vérifier DATABASE_URL dans backend/.env.',
    )
    throw error
  }
}

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
  await assertDatabaseReachable(log)

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
