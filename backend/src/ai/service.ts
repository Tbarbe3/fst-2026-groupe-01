import type { FastifyBaseLogger } from 'fastify'

import { pickCatalogEntry } from './mock-catalog.js'
import type { AiProvider, JudgeInput } from './provider.js'
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
    scenario: buildScenario(structuredClone(entry.scenario)),
    params: { language: entry.language, difficulty: entry.difficulty, category: entry.category },
    source: 'seed',
    model: provider.name === 'mock' ? 'mock' : 'catalogue',
  }
}

export interface JudgementOutcome extends JudgeResult {
  score: number
  breakdown: ScoreBreakdown
  judgedBy: 'ai' | 'heuristic'
}

export async function judgeAttempt(
  provider: AiProvider,
  input: JudgeInput,
  log: FastifyBaseLogger,
): Promise<JudgementOutcome> {
  let result: JudgeResult
  let judgedBy: JudgementOutcome['judgedBy'] = 'ai'

  if (input.comments.length === 0) {
    result = {
      summary: 'Tu as approuvé la pull request sans aucune remarque, alors qu’elle contenait des anomalies. C’est exactement le réflexe que cet exercice veut corriger.',
      verdicts: [],
    }
  } else {
    try {
      result = sanitizeJudgeOutput(await provider.judge(input), input.comments, input.groundTruth)
    } catch (error) {
      log.warn({ err: error }, 'Juge IA indisponible, repli heuristique')
      result = heuristicJudge(input.comments, input.groundTruth)
      judgedBy = 'heuristic'
    }
  }

  const { score, breakdown } = computeScore(input.groundTruth, result.verdicts)
  return { ...result, score, breakdown, judgedBy }
}
