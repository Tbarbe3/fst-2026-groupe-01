/**
 * L'AggregateError de pg a un `message` vide quand toutes les adresses
 * échouent : `error.message` seul afficherait « () ». Module séparé pour
 * rester importable sans ouvrir de pool.
 */
export function describeDatabaseError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)

  const code = (error as NodeJS.ErrnoException).code
  if (error.message) return code ? `${code} — ${error.message}` : error.message
  return code ?? error.name
}
