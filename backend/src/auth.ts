import { betterAuth } from 'better-auth'

import { env, isProduction } from './config/env.js'
import { pool } from './db/pool.js'

export const auth = betterAuth({
  database: pool,
  baseURL: env.betterAuthUrl,
  ...(env.betterAuthSecret ? { secret: env.betterAuthSecret } : {}),
  trustedOrigins: isProduction
    ? [env.betterAuthUrl, env.corsOrigin]
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        env.corsOrigin,
      ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Un plafond évite qu'un mot de passe très long ne serve à saturer le
    // hachage, coûteux par construction.
    maxPasswordLength: 128,
    // Aucun envoi de courrier n'est configuré : exiger la vérification
    // enfermerait les comptes créés hors de l'application.
    requireEmailVerification: false,
  },
})
