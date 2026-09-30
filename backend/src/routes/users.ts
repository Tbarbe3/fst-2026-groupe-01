import type { FastifyPluginAsync } from 'fastify'

import { pool } from '../db/pool.js'

export interface UserSummary {
  id: string
  username: string
  createdAt: string
}

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get('/users', async (_request, reply) => {
    // `password_hash` n'est volontairement pas sélectionné : rien ne doit
    // pouvoir le faire remonter jusqu'au navigateur, même par accident.
    const result = await pool.query<{
      id: string
      username: string
      created_at: Date
    }>(
      `SELECT id, username, created_at
         FROM users
        ORDER BY created_at ASC`,
    )

    const users: UserSummary[] = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      createdAt: row.created_at.toISOString(),
    }))

    return reply.send({ users })
  })
}
