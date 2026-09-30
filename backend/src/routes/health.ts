import type { FastifyPluginAsync } from 'fastify'

/**
 * Sonde utilisée par Docker Compose (healthcheck) et par le front pour
 * vérifier que l'API répond avant d'afficher une erreur réseau.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))
}
