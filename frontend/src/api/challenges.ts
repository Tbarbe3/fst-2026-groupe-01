import type { DiffLine } from '../components/DiffViewer'
import { getCurrentLocale, translate } from '@/i18n'

export interface DiffFile {
  path: string
  lines: DiffLine[]
}

export interface GroundTruthItem {
  id: string
  file: string
  line_number: number
  lines: number[]
  type: string
  severity: 'critical' | 'major' | 'minor'
  expected_issue: string
  why: string
  ideal_fix: string
  fixed_lines: string[]
}

export interface ReviewComment {
  file_path: string
  line_number: number
  text: string
}

export interface JudgedComment extends ReviewComment {
  matched_issue_id: string | null
  clarity_score: number
  feedback: string
}

export interface ScoreBreakdown {
  found: number
  total: number
  false_positives: number
  reasoning_quality: number
  detection: number
  explanation: number
  precision: number
}

interface ScenarioView {
  id: string
  title: string
  ticketContext: string
  language: string
  difficulty: string | null
  category: string | null
  persona: { name: string; archetype: string; bio: string }
  files: DiffFile[]
}

export interface AttemptInProgress {
  id: string
  status: 'in_progress'
  isMystery: boolean
  startedAt: string
  scenario: ScenarioView
}

export interface AttemptSubmitted {
  id: string
  status: 'submitted'
  isMystery: boolean
  score: number
  scoreBreakdown: ScoreBreakdown
  aiSummary: string
  judgedBy: 'ai' | 'heuristic'
  startedAt: string
  submittedAt: string
  scenario: ScenarioView & { groundTruth: GroundTruthItem[] }
  comments: JudgedComment[]
}

export type Attempt = AttemptInProgress | AttemptSubmitted

export interface AttemptSummary {
  id: string
  title: string
  language: string
  category: string
  difficulty: string
  score: number
  submittedAt: string
}

export type ChallengeRequest =
  | { mystery: true }
  | { language: string; difficulty: string; category: string }

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_ERROR_KEYS: Record<string, string> = {
  UNAUTHORIZED: 'apiErrors.unauthorized',
  MISSING_PARAMS: 'apiErrors.missingParams',
  ATTEMPT_NOT_FOUND: 'apiErrors.attemptNotFound',
  ALREADY_SUBMITTED: 'apiErrors.alreadySubmitted',
  INVALID_COMMENT: 'apiErrors.invalidComment',
}

/** Traduit le `code` de l'API ; un 5xx reste générique pour ne rien divulguer. */
function describeApiError(status: number, body: { code?: string; message?: string } | null): string {
  const locale = getCurrentLocale()
  if (status === 429) return translate(locale, 'apiErrors.rateLimited')
  if (status >= 500) return translate(locale, 'errors.server')
  const key = body?.code && API_ERROR_KEYS[body.code]
  return key ? translate(locale, key) : (body?.message ?? translate(locale, 'errors.server'))
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null
  if (!response.ok) throw new ApiError(describeApiError(response.status, body), response.status)
  return body as T
}

export const challengesApi = {
  create: (body: ChallengeRequest) =>
    request<{ attemptId: string }>('/challenges', {
      method: 'POST',
      body: JSON.stringify({ ...body, locale: getCurrentLocale() }),
    }),
  get: (attemptId: string) => request<Attempt>(`/attempts/${encodeURIComponent(attemptId)}`),
  submit: (attemptId: string, comments: ReviewComment[]) =>
    request<{ attemptId: string; score: number }>(
      `/attempts/${encodeURIComponent(attemptId)}/submit`,
      { method: 'POST', body: JSON.stringify({ comments, locale: getCurrentLocale() }) },
    ),
  history: () => request<{ attempts: AttemptSummary[] }>('/me/attempts'),
}
