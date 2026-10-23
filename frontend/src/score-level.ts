export type ScoreLevel = 'high' | 'medium' | 'low'

export function scoreLevel(score: number): ScoreLevel {
  return score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
}

export const SCORE_VERDICT_KEYS: Record<ScoreLevel, string> = {
  high: 'dashboard.excellentAnalysis',
  medium: 'dashboard.goodAnalysis',
  low: 'dashboard.needsWork',
}
