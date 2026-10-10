import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

/**
 * Fastify renvoie `err.message` par défaut, ce qui exposerait un fragment de
 * requête PostgreSQL. Fabrique et non constante, pour que les tests couvrent
 * les deux modes sans charger `env.ts`.
 */
export function createErrorHandler(isProduction: boolean) {
  return function handleError(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const status = error.statusCode ?? 500

    if (status >= 500) {
      request.log.error({ err: error }, 'Erreur non gérée')
      return reply.status(status).send({
        statusCode: status,
        error: 'Internal Server Error',
        message: isProduction
          ? 'Une erreur interne est survenue.'
          : error.message,
      })
    }

    // Les erreurs 4xx sont produites volontairement (validation, limitation
    // de débit) : leur message est destiné au client.
    return reply.status(status).send({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
