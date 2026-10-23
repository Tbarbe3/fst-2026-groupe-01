import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { MOCK_CATALOG } from '../ai/mock-catalog.js'
import { createMockProvider } from '../ai/provider.js'
import { buildScenario } from '../ai/scenario-builder.js'
import type { AttemptRecord, ChallengesRepo } from '../db/challenges-repo.js'
import { challengesRoutes } from './challenges.js'

const ATTEMPT_ID = '11111111-1111-4111-8111-111111111111'
const built = buildScenario(structuredClone(MOCK_CATALOG[0].scenario))
const issue = built.groundTruth[0]

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: ATTEMPT_ID,
    status: 'in_progress',
    isMystery: false,
    score: null,
    scoreBreakdown: {},
    aiSummary: null,
    judgedBy: null,
    startedAt: '2026-10-14T10:00:00.000Z',
    submittedAt: null,
    scenario: {
      id: 'scn',
      title: built.title,
      ticketContext: built.ticketContext,
      language: 'typescript',
      difficulty: '3',
      category: 'security_owasp',
      persona: built.persona,
      files: built.files,
      groundTruth: built.groundTruth,
    },
    comments: [],
    ...overrides,
  }
}

function fakeRepo(overrides: Partial<ChallengesRepo> = {}): ChallengesRepo {
  return {
    findUnplayedScenario: vi.fn(async () => null),
    insertScenario: vi.fn(async () => 'scn'),
    createAttempt: vi.fn(async () => ATTEMPT_ID),
    getAttempt: vi.fn(async () => attempt()),
    saveJudgement: vi.fn(async () => true),
    listSubmitted: vi.fn(async () => []),
    listInProgress: vi.fn(async () => []),
    ...overrides,
  }
}

async function buildTestApp(repo = fakeRepo(), userId: string | null = 'u1') {
  const app = Fastify()
  await app.register(challengesRoutes, {
    prefix: '/api',
    repo,
    ai: createMockProvider(0),
    getUserId: async () => userId,
  })
  return app
}

describe('routes des challenges', () => {
  it('refuse un visiteur non connecté', async () => {
    const app = await buildTestApp(fakeRepo(), null)
    const res = await app.inject({ method: 'GET', url: `/api/attempts/${ATTEMPT_ID}` })
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('UNAUTHORIZED')
  })

  it('crée un challenge en générant un scénario si aucun n’est disponible', async () => {
    const repo = fakeRepo()
    const app = await buildTestApp(repo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/challenges',
      payload: { language: 'typescript', difficulty: '3', category: 'security_owasp' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ attemptId: ATTEMPT_ID })
    expect(repo.insertScenario).toHaveBeenCalledOnce()
  })

  it('cherche et génère le scénario dans la langue du joueur', async () => {
    const repo = fakeRepo()
    const app = await buildTestApp(repo)
    await app.inject({
      method: 'POST',
      url: '/api/challenges',
      payload: { language: 'typescript', difficulty: '3', category: 'security_owasp', locale: 'en' },
    })
    expect(repo.findUnplayedScenario).toHaveBeenCalledWith('u1', expect.objectContaining({ locale: 'en' }))
    const [, outcome] = vi.mocked(repo.insertScenario).mock.calls[0]!
    expect(outcome.params.locale).toBe('en')
    expect(outcome.scenario.title).toMatch(/^PR #\d+: /)
  })

  it('suppose le français quand la langue n’est pas précisée', async () => {
    const repo = fakeRepo()
    const app = await buildTestApp(repo)
    await app.inject({ method: 'POST', url: '/api/challenges', payload: { mystery: true } })
    expect(repo.findUnplayedScenario).toHaveBeenCalledWith('u1', expect.objectContaining({ locale: 'fr' }))
  })

  it('refuse une langue inconnue', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'POST', url: '/api/challenges', payload: { mystery: true, locale: 'de' } })
    expect(res.statusCode).toBe(400)
  })

  it('renvoie l’historique et les parties à reprendre', async () => {
    const inProgress = [{ id: ATTEMPT_ID, title: 'PR', language: 'go', category: null, difficulty: null, isMystery: true, startedAt: '2026-10-22T08:00:00.000Z' }]
    const repo = fakeRepo({ listInProgress: vi.fn(async () => inProgress) })
    const app = await buildTestApp(repo)
    const res = await app.inject({ method: 'GET', url: '/api/me/attempts' })
    expect(res.json()).toEqual({ attempts: [], inProgress })
    expect(repo.listInProgress).toHaveBeenCalledWith('u1')
  })

  it('réutilise un scénario existant sans appeler l’IA', async () => {
    const repo = fakeRepo({ findUnplayedScenario: vi.fn(async () => 'deja-la') })
    const app = await buildTestApp(repo)
    await app.inject({ method: 'POST', url: '/api/challenges', payload: { mystery: true } })
    expect(repo.insertScenario).not.toHaveBeenCalled()
    expect(repo.createAttempt).toHaveBeenCalledWith('u1', 'deja-la', true)
  })

  it('exige des filtres complets hors mode Mystère', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'POST', url: '/api/challenges', payload: { language: 'go' } })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('MISSING_PARAMS')
  })

  it('refuse un langage inconnu', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/challenges',
      payload: { language: 'cobol', difficulty: '3', category: 'performance' },
    })
    expect(res.statusCode).toBe(400)
  })

  // Garde-fou central du jeu : la réponse ne doit pas être lisible dans
  // l'onglet Réseau pendant la revue.
  it('ne divulgue pas la ground truth avant la soumission', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: `/api/attempts/${ATTEMPT_ID}` })
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('groundTruth')
    expect(res.body).not.toContain(issue.expected_issue)
  })

  it('masque difficulté et catégorie en mode Mystère', async () => {
    const repo = fakeRepo({ getAttempt: vi.fn(async () => attempt({ isMystery: true })) })
    const body = (await (await buildTestApp(repo)).inject({ method: 'GET', url: `/api/attempts/${ATTEMPT_ID}` })).json()
    expect(body.scenario.difficulty).toBeNull()
    expect(body.scenario.category).toBeNull()
  })

  it('expose la ground truth une fois la revue soumise', async () => {
    const repo = fakeRepo({ getAttempt: vi.fn(async () => attempt({ status: 'submitted', score: 80 })) })
    const body = (await (await buildTestApp(repo)).inject({ method: 'GET', url: `/api/attempts/${ATTEMPT_ID}` })).json()
    expect(body.scenario.groundTruth).toHaveLength(built.groundTruth.length)
  })

  it('note et enregistre une revue', async () => {
    const repo = fakeRepo()
    const app = await buildTestApp(repo)
    const res = await app.inject({
      method: 'POST',
      url: `/api/attempts/${ATTEMPT_ID}/submit`,
      payload: { comments: [{ file_path: issue.file, line_number: issue.line_number, text: 'La signature Stripe n’est pas vérifiée' }] },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().score).toBeGreaterThan(0)
    const saved = vi.mocked(repo.saveJudgement).mock.calls[0][2]
    expect(saved[0].matched_issue_id).toBe(issue.id)
  })

  it('rédige les retours du juge dans la langue du joueur', async () => {
    const repo = fakeRepo()
    const app = await buildTestApp(repo)
    await app.inject({
      method: 'POST',
      url: `/api/attempts/${ATTEMPT_ID}/submit`,
      payload: { locale: 'en', comments: [{ file_path: issue.file, line_number: 1, text: 'Unrelated remark' }] },
    })
    const [, judgement, saved] = vi.mocked(repo.saveJudgement).mock.calls[0]!
    expect(judgement.summary).toMatch(/^\[Simulated mode\]/)
    expect(saved[0]!.feedback).toMatch(/does not contain an expected flaw/)
  })

  it('refuse un commentaire sur une ligne absente du diff', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: `/api/attempts/${ATTEMPT_ID}/submit`,
      payload: { comments: [{ file_path: issue.file, line_number: 9999, text: 'x' }] },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('INVALID_COMMENT')
  })

  it('refuse une seconde soumission', async () => {
    const repo = fakeRepo({ getAttempt: vi.fn(async () => attempt({ status: 'submitted' })) })
    const res = await (await buildTestApp(repo)).inject({
      method: 'POST',
      url: `/api/attempts/${ATTEMPT_ID}/submit`,
      payload: { comments: [] },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('ALREADY_SUBMITTED')
  })

  it('répond 404 pour la tentative d’un autre utilisateur', async () => {
    const repo = fakeRepo({ getAttempt: vi.fn(async () => null) })
    const res = await (await buildTestApp(repo)).inject({ method: 'GET', url: `/api/attempts/${ATTEMPT_ID}` })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('ATTEMPT_NOT_FOUND')
  })
})
