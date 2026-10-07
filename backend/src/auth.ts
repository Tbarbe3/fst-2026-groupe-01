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
  },
})
