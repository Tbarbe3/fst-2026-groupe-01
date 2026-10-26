import type { FastifyBaseLogger } from 'fastify'

import { localizedScenario, pickCatalogEntry } from './mock-catalog.js'
import { MESSAGES } from './messages.js'
import { createMockProvider, type AiProvider, type JudgeInput } from './provider.js'
import { buildScenario } from './scenario-builder.js'
import { computeScore, heuristicJudge, sanitizeJudgeOutput, type ScoreBreakdown } from './scoring.js'
import type { BuiltScenario, GenerationParams, JudgeResult } from './types.js'

export interface GenerationOutcome {
  scenario: BuiltScenario
  params: GenerationParams
  source: 'ai' | 'seed'
  model: string
}

// Seconde tentative plus froide : l'échec vient le plus souvent d'une
// sortie trop « créative » qui viole une règle du constructeur.
const TEMPERATURES = [0.9, 0.4]

export async function generateScenario(
  provider: AiProvider,
  params: GenerationParams,
  log: FastifyBaseLogger,
): Promise<GenerationOutcome> {
  if (provider.name === 'gemini') {
    for (const temperature of TEMPERATURES) {
      try {
        const raw = await provider.generateScenario(params, temperature)
        return { scenario: buildScenario(raw), params, source: 'ai', model: provider.generatorModel }
      } catch (error) {
        log.warn({ err: error, temperature }, 'Génération de scénario échouée')
      }
    }
    log.error('Gemini indisponible, repli sur le catalogue statique')
  } else {
    // En mode simulé, on passe quand même par le fournisseur pour subir sa latence.
    await provider.generateScenario(params, TEMPERATURES[0]!)
  }

  const entry = pickCatalogEntry(params)
  return {
    scenario: buildScenario(localizedScenario(entry, params.locale)),
    params: { language: entry.language, difficulty: entry.difficulty, category: entry.category, locale: params.locale },
    source: 'seed',
    model: provider.name === 'mock' ? 'mock' : 'catalogue',
  }
}

export interface JudgementOutcome extends JudgeResult {
  score: number
  breakdown: ScoreBreakdown
  judgedBy: 'ai' | 'heuristic'
}

const fallbackProvider = createMockProvider(0)

async function fallbackJudge(input: JudgeInput, log: FastifyBaseLogger): Promise<JudgeResult> {
  try {
    const raw = await fallbackProvider.judge(input)
    const result = sanitizeJudgeOutput(raw, input.comments, input.groundTruth, input.locale)
    // La synthèse signale le repli au joueur, comme le fait le débriefing.
    return { ...result, summary: MESSAGES[input.locale].heuristicSummary }
  } catch (error) {
    log.error({ err: error }, 'Juge simulé en échec, repli heuristique')
    return heuristicJudge(input.comments, input.groundTruth, input.locale)
  }
}

export async function judgeAttempt(
  provider: AiProvider,
  input: JudgeInput,
  log: FastifyBaseLogger,
): Promise<JudgementOutcome> {
  let result: JudgeResult
  let judgedBy: JudgementOutcome['judgedBy'] = 'ai'

  if (input.comments.length === 0) {
    result = { summary: MESSAGES[input.locale].approvedWithoutRemarks, verdicts: [] }
  } else {
    try {
      result = sanitizeJudgeOutput(await provider.judge(input), input.comments, input.groundTruth, input.locale)
    } catch (error) {
      // Quota dépassé, clé invalide, délai, sortie mal formée : le juge simulé
      // prend le relais, pour qu'une démo ne dépende jamais de la clé API.
      log.warn({ err: error }, 'Juge IA indisponible, repli sur le juge simulé')
      result = await fallbackJudge(input, log)
      judgedBy = 'heuristic'
    }
  }

  const { score, breakdown } = computeScore(input.groundTruth, result.verdicts)
  return { ...result, score, breakdown, judgedBy }
}
