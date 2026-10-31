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

  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),

  // Origine telle que le navigateur la voit, et non celle du conteneur :
  // Traefik termine le TLS, l'API ne peut donc pas la déduire de la requête.
  betterAuthUrl: optional('BETTER_AUTH_URL', 'http://localhost:3000'),

  betterAuthSecret: process.env['BETTER_AUTH_SECRET'] ?? '',

  geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
  // Sans clé, le mode simulé s'impose : un poste neuf démarre sans rien configurer.
  aiMode: (process.env['AI_MODE'] || (process.env['GEMINI_API_KEY'] ? 'gemini' : 'mock')) as string,
  geminiGeneratorModel: optional('GEMINI_MODEL_GENERATOR', 'gemini-3.5-flash-lite'),
  geminiJudgeModel: optional('GEMINI_MODEL_JUDGE', 'gemini-3.5-flash-lite'),
  mockLatencyMs: Number(optional('MOCK_LATENCY_MS', '1500')),
} as const

if (env.aiMode !== 'mock' && env.aiMode !== 'gemini') {
  throw new Error(`AI_MODE vaut « ${env.aiMode} » : valeurs acceptées « mock » ou « gemini ».`)
}

if (env.aiMode === 'gemini' && !env.geminiApiKey) {
  throw new Error(
    'AI_MODE=gemini exige GEMINI_API_KEY. Pour tester sans consommer de jetons : AI_MODE=mock.',
  )
}

export const isProduction = env.nodeEnv === 'production'

// Ces deux contrôles ne valent qu'en production : une session signée avec le
// secret par défaut de Better Auth est falsifiable, et une baseURL en HTTP
// prive les cookies de l'attribut Secure. Mieux vaut refuser de démarrer.
if (isProduction && !env.betterAuthSecret) {
  throw new Error(
    'BETTER_AUTH_SECRET est obligatoire en production : sans elle, les cookies de session sont signés avec une valeur par défaut et donc falsifiables.\n' +
      '  Générer :  openssl rand -hex 32',
  )
}

if (isProduction && env.betterAuthUrl.startsWith('http://')) {
  throw new Error(
    `BETTER_AUTH_URL vaut « ${env.betterAuthUrl} » en production : il faut l'URL HTTPS publique du site, sinon les cookies de session ne porteront pas l'attribut Secure.`,
  )
}
