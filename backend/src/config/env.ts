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

  // Brique IA (cf. README : générateur de scénario + juge évaluateur)
  geminiApiKey: required('GEMINI_API_KEY'),

  // Origine autorisée pour le front en dev ; en prod Nginx sert les deux
  // sous le même domaine et le CORS devient inutile.
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
} as const

export const isProduction = env.nodeEnv === 'production'
