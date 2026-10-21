import { describe, expect, it, vi } from 'vitest'
import type { FastifyBaseLogger } from 'fastify'

import { MOCK_CATALOG } from './mock-catalog.js'
import { createMockProvider, type AiProvider } from './provider.js'
import { buildScenario } from './scenario-builder.js'
import { generateScenario, judgeAttempt } from './service.js'
import type { GenerationParams } from './types.js'

const log = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as FastifyBaseLogger
const PARAMS: GenerationParams = { language: 'typescript', difficulty: '3', category: 'security_owasp', locale: 'fr' }
const ENTRY = MOCK_CATALOG[0]

function fakeGemini(overrides: Partial<AiProvider>): AiProvider {
  return {
    name: 'gemini',
    generatorModel: 'gemini-test',
    generateScenario: vi.fn(),
    judge: vi.fn(),
    ...overrides,
  }
}

describe('generateScenario', () => {
  it('retient la sortie du modèle quand elle est valide', async () => {
    const provider = fakeGemini({ generateScenario: vi.fn(async () => structuredClone(ENTRY.scenario)) })
    const outcome = await generateScenario(provider, PARAMS, log)
    expect(outcome).toMatchObject({ source: 'ai', model: 'gemini-test' })
  })

  it('relance une fois, plus froid, après une sortie invalide', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({ title: 'incomplet' })
      .mockResolvedValueOnce(structuredClone(ENTRY.scenario))
    const outcome = await generateScenario(fakeGemini({ generateScenario: generate }), PARAMS, log)
    expect(generate.mock.calls.map((c) => c[1])).toEqual([0.9, 0.4])
    expect(outcome.source).toBe('ai')
  })

  it('se replie sur le catalogue après deux échecs', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('503'))
    const outcome = await generateScenario(fakeGemini({ generateScenario: generate }), PARAMS, log)
    expect(generate).toHaveBeenCalledTimes(2)
    expect(outcome.source).toBe('seed')
  })

  it('sert le catalogue en mode simulé', async () => {
    const outcome = await generateScenario(createMockProvider(0), PARAMS, log)
    expect(outcome).toMatchObject({ source: 'seed', model: 'mock', params: PARAMS })
  })

  it('sert le catalogue dans la langue du joueur', async () => {
    const outcome = await generateScenario(createMockProvider(0), { ...PARAMS, locale: 'en' }, log)
    expect(outcome.params.locale).toBe('en')
    expect(outcome.scenario.title).toBe(ENTRY.en.title)
  })
})

describe('judgeAttempt', () => {
  const groundTruth = buildScenario(structuredClone(ENTRY.scenario)).groundTruth
  const target = groundTruth[0]
  const comments = [{ file_path: target.file, line_number: target.line_number, text: 'Signature non vérifiée' }]

  it('bascule sur l’heuristique si le juge échoue', async () => {
    const provider = fakeGemini({ judge: vi.fn().mockRejectedValue(new Error('timeout')) })
    const outcome = await judgeAttempt(provider, { groundTruth, comments, codeLines: [''], locale: 'fr' as const }, log)
    expect(outcome.judgedBy).toBe('heuristic')
    expect(outcome.breakdown.found).toBe(1)
  })

  it('n’appelle pas le juge pour une revue vide', async () => {
    const judge = vi.fn()
    const outcome = await judgeAttempt(fakeGemini({ judge }), { groundTruth, comments: [], codeLines: [], locale: 'fr' as const }, log)
    expect(judge).not.toHaveBeenCalled()
    expect(outcome.score).toBe(0)
  })

  it('rédige la synthèse d’une revue vide dans la langue du joueur', async () => {
    const outcome = await judgeAttempt(fakeGemini({}), { groundTruth, comments: [], codeLines: [], locale: 'en' }, log)
    expect(outcome.summary).toMatch(/^You approved the pull request/)
  })

  it('note une bonne réponse en mode simulé', async () => {
    const outcome = await judgeAttempt(createMockProvider(0), { groundTruth, comments, codeLines: [''], locale: 'fr' as const }, log)
    expect(outcome.judgedBy).toBe('ai')
    expect(outcome.verdicts[0].matched_issue_id).toBe(target.id)
  })
})
