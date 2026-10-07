/**
 * L'AggregateError que lève pg quand toutes les adresses résolues échouent a
 * un `message` vide : s'en tenir à `error.message` afficherait « () ».
 *
 * Module séparé de `migrate.ts` pour rester importable sans ouvrir de pool
 * ni exiger DATABASE_URL.
 */
export function describeDatabaseError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)

  const code = (error as NodeJS.ErrnoException).code
  if (error.message) return code ? `${code} — ${error.message}` : error.message
  return code ?? error.name
}
