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

/**
 * Hôte, port et base, sans identifiants — à logger au démarrage. Le tunnel
 * et la base locale résolvent au même `127.0.0.1:5432` : un compte créé
 * sous l'un est invisible depuis l'autre, ce qui ressemble à un mot de passe refusé.
 */
export function describeDatabaseTarget(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl)
    return `${url.hostname}:${url.port || '5432'}${url.pathname}`
  } catch {
    return 'URL de connexion invalide'
  }
}
