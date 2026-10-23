import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import type { AiProvider } from '../ai/provider.js'
import { generateScenario, judgeAttempt } from '../ai/service.js'
import {
  CATEGORIES,
  DIFFICULTIES,
  LANGUAGES,
  LOCALES,
  type GenerationParams,
  type Locale,
  type SubmittedComment,
} from '../ai/types.js'
import type { AttemptRecord, ChallengesRepo } from '../db/challenges-repo.js'

export interface ChallengesRoutesOptions {
  repo: ChallengesRepo
  ai: AiProvider
  getUserId(request: FastifyRequest): Promise<string | null>
  random?: () => number
}

export const GENERATION_RATE_LIMIT = { max: 15, timeWindow: '1 hour' } as const
export const MAX_COMMENTS = 30

/**
 * La ground truth ne quitte le serveur qu'après soumission : sinon l'onglet
 * Réseau du navigateur donnerait les réponses.
 */
export function toAttemptView(attempt: AttemptRecord) {
  const { groundTruth, ...scenario } = attempt.scenario
  if (attempt.status === 'in_progress') {
    return {
      id: attempt.id,
      status: attempt.status,
      isMystery: attempt.isMystery,
      startedAt: attempt.startedAt,
      scenario: attempt.isMystery
        ? { ...scenario, difficulty: null, category: null }
        : scenario,
    }
  }
  return { ...attempt, scenario: { ...scenario, groundTruth } }
}

// Le `code` est stable et traduit par le front ; le message sert de repli lisible.
const API_ERRORS = {
  UNAUTHORIZED: [401, 'Unauthorized', 'Connexion requise.'],
  MISSING_PARAMS: [400, 'Bad Request', 'Choisissez un langage, une difficulté et une catégorie, ou le mode Mystère.'],
  ATTEMPT_NOT_FOUND: [404, 'Not Found', 'Challenge introuvable.'],
  ALREADY_SUBMITTED: [409, 'Conflict', 'Cette revue a déjà été soumise.'],
  INVALID_COMMENT: [400, 'Bad Request', 'Un commentaire vise une ligne absente du diff ou est vide.'],
} as const

export function sendApiError(reply: FastifyReply, code: keyof typeof API_ERRORS) {
  const [statusCode, error, message] = API_ERRORS[code]
  return reply.status(statusCode).send({ statusCode, error, code, message })
}

function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)]!
}

export const challengesRoutes: FastifyPluginAsync<ChallengesRoutesOptions> = async (app, opts) => {
  const { repo, ai } = opts
  const random = opts.random ?? Math.random

  app.addHook('preHandler', async (request, reply) => {
    const userId = await opts.getUserId(request)
    if (!userId) {
      return sendApiError(reply, 'UNAUTHORIZED')
    }
    request.userId = userId
  })

  app.post<{ Body: { mystery?: boolean; language?: string; difficulty?: string; category?: string; locale?: Locale } }>(
    '/challenges',
    {
      config: { rateLimit: GENERATION_RATE_LIMIT },
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            mystery: { type: 'boolean' },
            language: { type: 'string', enum: [...LANGUAGES] },
            difficulty: { type: 'string', enum: [...DIFFICULTIES] },
            category: { type: 'string', enum: [...CATEGORIES] },
            locale: { type: 'string', enum: [...LOCALES] },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body
      const mystery = body.mystery === true
      if (!mystery && (!body.language || !body.difficulty || !body.category)) {
        return sendApiError(reply, 'MISSING_PARAMS')
      }
      const params = {
        language: body.language ?? pick(LANGUAGES, random),
        difficulty: mystery ? pick(DIFFICULTIES, random) : body.difficulty,
        category: mystery ? pick(CATEGORIES, random) : body.category,
        locale: body.locale ?? 'fr',
      } as GenerationParams

      // Un scénario déjà en base ne coûte aucun appel à l'IA.
      let scenarioId = await repo.findUnplayedScenario(request.userId, params)
      if (!scenarioId) {
        const outcome = await generateScenario(ai, params, request.log)
        scenarioId = await repo.insertScenario(request.userId, outcome)
      }
      const attemptId = await repo.createAttempt(request.userId, scenarioId, mystery)
      return reply.status(201).send({ attemptId })
    },
  )

  app.get('/me/attempts', async (request) => {
    const [attempts, inProgress] = await Promise.all([
      repo.listSubmitted(request.userId),
      repo.listInProgress(request.userId),
    ])
    return { attempts, inProgress }
  })

  app.get<{ Params: { id: string } }>('/attempts/:id', async (request, reply) => {
    const attempt = await repo.getAttempt(request.params.id, request.userId)
    if (!attempt) {
      return sendApiError(reply, 'ATTEMPT_NOT_FOUND')
    }
    return toAttemptView(attempt)
  })

  app.post<{ Params: { id: string }; Body: { comments: SubmittedComment[]; locale?: Locale } }>(
    '/attempts/:id/submit',
    {
      // 30 commentaires de 2 000 caractères dépassent les 64 Kio globaux.
      bodyLimit: 256 * 1024,
      schema: {
        body: {
          type: 'object',
          required: ['comments'],
          additionalProperties: false,
          properties: {
            locale: { type: 'string', enum: [...LOCALES] },
            comments: {
              type: 'array',
              maxItems: MAX_COMMENTS,
              items: {
                type: 'object',
                required: ['file_path', 'line_number', 'text'],
                additionalProperties: false,
                properties: {
                  file_path: { type: 'string', minLength: 1, maxLength: 255 },
                  line_number: { type: 'integer', minimum: 1 },
                  text: { type: 'string', minLength: 1, maxLength: 2000 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const attempt = await repo.getAttempt(request.params.id, request.userId)
      if (!attempt) {
        return sendApiError(reply, 'ATTEMPT_NOT_FOUND')
      }
      if (attempt.status !== 'in_progress') {
        return sendApiError(reply, 'ALREADY_SUBMITTED')
      }

      const comments = request.body.comments.map((c) => ({ ...c, text: c.text.trim() }))
      const codeLines: string[] = []
      for (const comment of comments) {
        const line = attempt.scenario.files
          .find((f) => f.path === comment.file_path)
          ?.lines.find((l) => l.newLineNumber === comment.line_number)
        if (!line || !comment.text) {
          return sendApiError(reply, 'INVALID_COMMENT')
        }
        codeLines.push(line.code)
      }

      const judgement = await judgeAttempt(
        ai,
        { groundTruth: attempt.scenario.groundTruth, comments, codeLines, locale: request.body.locale ?? 'fr' },
        request.log,
      )
      const saved = await repo.saveJudgement(
        attempt.id,
        { score: judgement.score, breakdown: judgement.breakdown, summary: judgement.summary, judgedBy: judgement.judgedBy },
        comments.map((c, i) => ({ ...c, ...judgement.verdicts[i]! })),
      )
      if (!saved) {
        return sendApiError(reply, 'ALREADY_SUBMITTED')
      }
      return { attemptId: attempt.id, score: judgement.score }
    },
  )
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}
