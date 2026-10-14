import { callGemini } from './gemini.js'
import { pickCatalogEntry } from './mock-catalog.js'
import {
  GENERATOR_SCHEMA,
  GENERATOR_SYSTEM,
  JUDGE_SCHEMA,
  JUDGE_SYSTEM,
  generatorPrompt,
  judgePrompt,
} from './prompts.js'
import { candidateIssues } from './scoring.js'
import type { GenerationParams, GroundTruthItem, SubmittedComment } from './types.js'

export interface JudgeInput {
  groundTruth: GroundTruthItem[]
  comments: SubmittedComment[]
  /** Texte de la ligne commentée, pour que le juge n'ait pas à lire tout le diff. */
  codeLines: string[]
}

/** Les deux méthodes renvoient une sortie brute, validée ensuite par l'appelant. */
export interface AiProvider {
  readonly name: 'mock' | 'gemini'
  readonly generatorModel: string
  generateScenario(params: GenerationParams, temperature: number): Promise<unknown>
  judge(input: JudgeInput): Promise<unknown>
}

function judgeComments(input: JudgeInput) {
  return input.comments.map((c, i) => ({
    comment_index: i,
    file: c.file_path,
    line: c.line_number,
    code_line: input.codeLines[i] ?? '',
    text: c.text,
    candidate_issue_ids: candidateIssues(c, input.groundTruth),
  }))
}

export function createGeminiProvider(config: {
  apiKey: string
  generatorModel: string
  judgeModel: string
}): AiProvider {
  return {
    name: 'gemini',
    generatorModel: config.generatorModel,
    generateScenario: (params, temperature) =>
      callGemini({
        apiKey: config.apiKey,
        model: config.generatorModel,
        system: GENERATOR_SYSTEM,
        prompt: generatorPrompt(params),
        schema: GENERATOR_SCHEMA,
        temperature,
      }),
    judge: (input) =>
      callGemini({
        apiKey: config.apiKey,
        model: config.judgeModel,
        system: JUDGE_SYSTEM,
        prompt: judgePrompt(input.groundTruth, judgeComments(input)),
        schema: JUDGE_SCHEMA,
        temperature: 0,
        timeoutMs: 30_000,
      }),
  }
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function keywords(text: string): Set<string> {
  return new Set(normalize(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 5))
}

/**
 * Simule Gemini sans consommer de jeton : scénarios du catalogue, et un juge
 * qui note la clarté au recouvrement de mots-clés. Le délai imite la latence
 * réelle pour juger de l'interface en conditions proches.
 */
export function createMockProvider(latencyMs = 1500): AiProvider {
  const wait = () => new Promise((resolve) => setTimeout(resolve, latencyMs))

  return {
    name: 'mock',
    generatorModel: 'mock',
    async generateScenario(params) {
      await wait()
      return structuredClone(pickCatalogEntry(params).scenario)
    },
    async judge(input) {
      await wait()
      const verdicts = judgeComments(input).map((c) => {
        const issue = input.groundTruth.find((gt) => c.candidate_issue_ids.includes(gt.id))
        if (!issue) {
          return {
            comment_index: c.comment_index,
            matched_issue_id: '',
            clarity_score: 0,
            feedback: 'Cette ligne ne contient pas d’anomalie attendue. Remarque recevable en revue, mais hors du périmètre de l’exercice.',
          }
        }
        const expected = keywords(`${issue.expected_issue} ${issue.why} ${issue.ideal_fix}`)
        const overlap = [...keywords(c.text)].filter((w) => expected.has(w)).length
        const clarity = Math.min(95, 35 + overlap * 12 + (c.text.length > 80 ? 10 : 0))
        return {
          comment_index: c.comment_index,
          matched_issue_id: issue.id,
          clarity_score: clarity,
          feedback:
            clarity >= 70
              ? `Bien vu : ${issue.expected_issue.charAt(0).toLowerCase()}${issue.expected_issue.slice(1)} Ton explication couvre l’impact.`
              : 'Bonne ligne, mais l’explication reste vague : précise la cause et la conséquence concrète.',
        }
      })
      const found = new Set(verdicts.map((v) => v.matched_issue_id).filter(Boolean)).size
      return {
        summary: `[Mode simulé] Tu as repéré ${found} anomalie(s) sur ${input.groundTruth.length}. Ce retour est généré sans IA, pour tester l’interface.`,
        verdicts,
      }
    },
  }
}
