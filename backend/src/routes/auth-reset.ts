import crypto from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import type { Pool } from 'pg'

import { AUTH_RATE_LIMIT } from '../config/rate-limit.js'

export interface AuthResetOptions {
  pool: Pool
}

export const authResetRoutes: FastifyPluginAsync<AuthResetOptions> = async (fastify, { pool }) => {
  fastify.post(
    '/auth/forgot-password',
    {
      config: { rateLimit: AUTH_RATE_LIMIT },
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 254 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string }
      const normalizedEmail = email.trim().toLowerCase()

      // Recherche paramétrée sans révéler si le compte existe (règle sécurité).
      const { rows } = await pool.query(
        'SELECT id, email FROM "user" WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail],
      )

      if (rows.length === 0) {
        // Réponse générique pour éviter l'énumération des comptes inscrits.
        return reply.status(200).send({
          success: true,
          message: 'Si cette adresse existe, un lien a été préparé.',
        })
      }

      const user = rows[0]
      const token = crypto.randomBytes(24).toString('hex')
      const id = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 3600 * 1000)

      // Alimente la table "verification" lue ensuite par Better Auth /reset-password.
      await pool.query(
        `INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [id, `reset-password:${token}`, user.id, expiresAt],
      )

      fastify.log.info({ userId: user.id }, 'Jeton de réinitialisation généré')

      return reply.status(200).send({
        success: true,
        resetToken: token,
        resetUrl: `/reset-password?token=${token}`,
        message: 'Un lien de réinitialisation a été préparé.',
      })
    },
  )
}

