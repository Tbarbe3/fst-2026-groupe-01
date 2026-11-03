import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'

import { env, isProduction } from './config/env.js'
import { pool } from './db/pool.js'
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validatePasswordPolicy,
} from './password-policy.js'

// Chemins où Better Auth reçoit un mot de passe en clair à valider. La
// connexion n'y figure pas : un mot de passe créé sous une politique
// antérieure doit continuer à s'authentifier.
const PASSWORD_PATHS = new Set(['/sign-up/email', '/change-password', '/reset-password'])

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
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Un plafond évite qu'un mot de passe très long ne serve à saturer le
    // hachage, coûteux par construction.
    maxPasswordLength: MAX_PASSWORD_LENGTH,
    // Aucun envoi de courrier n'est configuré : exiger la vérification
    // enfermerait les comptes créés hors de l'application.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Trace la demande en l'absence de service SMTP externe.
      console.info(`[Auth] Lien de réinitialisation pour ${user.email} : ${url}`)
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // Même raison que requireEmailVerification ci-dessus : sans envoi de
      // courrier, exiger une confirmation bloquerait tout changement.
      updateEmailWithoutVerification: true,
    },
    // Le mot de passe est exigé côté client ; les tentatives partent en
    // cascade (review_attempts ON DELETE CASCADE).
    deleteUser: { enabled: true },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!PASSWORD_PATHS.has(ctx.path)) return
      const password = ctx.body?.password ?? ctx.body?.newPassword
      if (typeof password !== 'string') return

      const error = validatePasswordPolicy(password)
      if (error) {
        throw new APIError('BAD_REQUEST', { code: 'WEAK_PASSWORD', message: error })
      }

      // Refuse un nouveau mot de passe identique à l'actuel.
      if (ctx.path === '/change-password') {
        const current = ctx.body?.currentPassword
        if (typeof current === 'string' && current === password) {
          throw new APIError('BAD_REQUEST', {
            code: 'PASSWORD_SAME_AS_CURRENT',
            message: 'Le nouveau mot de passe doit être différent de l’ancien.',
          })
        }
      }

      // Même contrôle lors d'une réinitialisation via jeton.
      if (ctx.path === '/reset-password') {
        const token = ctx.body?.token
        if (typeof token === 'string') {
          const { rows } = await pool.query(
            `SELECT a.password FROM "verification" v
             JOIN "account" a ON a."userId" = v.value AND a."providerId" = 'credential'
             WHERE v.identifier = $1 AND v."expiresAt" > NOW()`,
            [`reset-password:${token}`],
          )
          if (rows.length > 0 && rows[0].password) {
            const isSame = await ctx.context.password.verify({
              hash: rows[0].password,
              password,
            })
            if (isSame) {
              throw new APIError('BAD_REQUEST', {
                code: 'PASSWORD_SAME_AS_CURRENT',
                message: 'Le nouveau mot de passe doit être différent de l’ancien.',
              })
            }
          }
        }
      }
    }),
  },
})
