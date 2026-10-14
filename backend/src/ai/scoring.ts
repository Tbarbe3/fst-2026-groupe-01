import type {
  CommentVerdict,
  GroundTruthItem,
  JudgeResult,
  Severity,
  SubmittedComment,
} from './types.js'

/** Écart toléré entre la ligne commentée et la ligne fautive. */
export const LINE_TOLERANCE = 2

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 3, major: 2, minor: 1 }

export const HEURISTIC_SUMMARY =
  'Analyse sémantique temporairement indisponible, résultat calculé d’après les lignes pointées.'

export interface ScoreBreakdown {
  found: number
  total: number
  found_criticals: number
  total_criticals: number
  false_positives: number
  reasoning_quality: number
  detection: number
  explanation: number
  precision: number
}

/**
 * Anomalies qu'un commentaire peut revendiquer. C'est ce filtre, et non le
 * juge, qui décide de la détection : une injection de prompt dans un
 * commentaire ne peut donc pas transformer un faux positif en trouvaille.
 */
export function candidateIssues(comment: SubmittedComment, groundTruth: GroundTruthItem[]): string[] {
  return groundTruth
    .filter(
      (gt) =>
        gt.file === comment.file_path &&
        gt.lines.some((line) => Math.abs(line - comment.line_number) <= LINE_TOLERANCE),
    )
    .map((gt) => gt.id)
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Ramène la sortie du juge dans le cadre autorisé par les candidats. */
export function sanitizeJudgeOutput(
  raw: unknown,
  comments: SubmittedComment[],
  groundTruth: GroundTruthItem[],
): JudgeResult {
  const record = (typeof raw === 'object' && raw !== null ? raw : {}) as {
    summary?: unknown
    verdicts?: { comment_index?: unknown; matched_issue_id?: unknown; clarity_score?: unknown; feedback?: unknown }[]
  }
  if (typeof record.summary !== 'string' || !Array.isArray(record.verdicts)) {
    throw new Error('Réponse du juge mal formée')
  }

  const verdicts: CommentVerdict[] = comments.map((comment, index) => {
    const raw = record.verdicts!.find((v) => v.comment_index === index)
    const candidates = candidateIssues(comment, groundTruth)
    const claimed = typeof raw?.matched_issue_id === 'string' ? raw.matched_issue_id : null
    // Le juge peut refuser un candidat (explication hors sujet), jamais en inventer un.
    const matched = claimed && candidates.includes(claimed) ? claimed : null
    return {
      matched_issue_id: matched,
      clarity_score: matched ? clamp(raw?.clarity_score, 0, 100, 50) : 0,
      feedback:
        typeof raw?.feedback === 'string' && raw.feedback.trim()
          ? raw.feedback.trim()
          : 'Aucun retour détaillé pour ce commentaire.',
    }
  })

  return { summary: record.summary.trim(), verdicts }
}

/** Juge sans LLM : la ligne seule fait foi, la clarté est forfaitaire. */
export function heuristicJudge(comments: SubmittedComment[], groundTruth: GroundTruthItem[]): JudgeResult {
  return {
    summary: HEURISTIC_SUMMARY,
    verdicts: comments.map((comment) => {
      const [matched = null] = candidateIssues(comment, groundTruth)
      return {
        matched_issue_id: matched,
        clarity_score: matched ? 50 : 0,
        feedback: matched
          ? 'Ligne correcte. La qualité de l’explication n’a pas pu être évaluée.'
          : 'Aucune anomalie attendue à cet endroit.',
      }
    }),
  }
}

/**
 * Note sur 100 : détection pondérée par la criticité (60), clarté des
 * explications retenues (30), précision (10, −5 par faux positif). Calculée
 * ici et jamais par le modèle, pour qu'elle reste reproductible.
 */
export function computeScore(
  groundTruth: GroundTruthItem[],
  verdicts: CommentVerdict[],
): { score: number; breakdown: ScoreBreakdown } {
  const foundIds = new Set(verdicts.map((v) => v.matched_issue_id).filter((id): id is string => id !== null))
  const found = groundTruth.filter((gt) => foundIds.has(gt.id))

  const totalWeight = groundTruth.reduce((sum, gt) => sum + SEVERITY_WEIGHT[gt.severity], 0)
  const foundWeight = found.reduce((sum, gt) => sum + SEVERITY_WEIGHT[gt.severity], 0)

  const matched = verdicts.filter((v) => v.matched_issue_id !== null)
  const reasoning = matched.length
    ? Math.round(matched.reduce((sum, v) => sum + v.clarity_score, 0) / matched.length)
    : 0
  const falsePositives = verdicts.length - matched.length

  const detection = totalWeight ? Math.round((60 * foundWeight) / totalWeight) : 0
  const explanation = Math.round((30 * reasoning) / 100)
  // Sans aucun commentaire, pas de point de précision : approuver une PR
  // sans la lire ne doit rien rapporter.
  const precision = verdicts.length === 0 ? 0 : Math.max(0, 10 - 5 * falsePositives)

  return {
    score: Math.min(100, detection + explanation + precision),
    breakdown: {
      found: found.length,
      total: groundTruth.length,
      found_criticals: found.filter((gt) => gt.severity === 'critical').length,
      total_criticals: groundTruth.filter((gt) => gt.severity === 'critical').length,
      false_positives: falsePositives,
      reasoning_quality: reasoning,
      detection,
      explanation,
      precision,
    },
  }
}
