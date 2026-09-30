/**
 * Lecture et validation des variables d'environnement au démarrage.
 * On échoue tout de suite si une clé obligatoire manque, plutôt que de
 * découvrir un `undefined` au milieu d'un appel à Gemini.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`)
  }
  return value
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  host: optional('HOST', '0.0.0.0'),
  port: Number(optional('PORT', '3000')),

  databaseUrl: required('DATABASE_URL'),

  // Brique IA (cf. README : générateur de scénario + juge évaluateur).
  // Volontairement pas `required()` : tant que la brique IA n'est pas
  // écrite, une clé absente ne doit pas empêcher l'API de démarrer. La
  // vérification se fait au point d'utilisation, via getGeminiApiKey().
  geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',

  // Origine autorisée pour le front en dev ; en prod Nginx sert les deux
  // sous le même domaine et le CORS devient inutile.
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
} as const

export const isProduction = env.nodeEnv === 'production'

/**
 * À appeler depuis les services qui interrogent Gemini. Échoue avec un
 * message explicite plutôt que d'envoyer une requête sans authentification.
 */
export function getGeminiApiKey(): string {
  if (!env.geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY n'est pas définie : la brique IA est indisponible.",
    )
  }
  return env.geminiApiKey
}
