import type pg from 'pg'

import type { ScoreBreakdown } from '../ai/scoring.js'
import type {
  BuiltScenario,
  CommentVerdict,
  DiffFile,
  GenerationParams,
  GroundTruthItem,
  SubmittedComment,
} from '../ai/types.js'

export interface AttemptRecord {
  id: string
  status: 'in_progress' | 'submitted'
  isMystery: boolean
  score: number | null
  scoreBreakdown: ScoreBreakdown | Record<string, never>
  aiSummary: string | null
  judgedBy: 'ai' | 'heuristic' | null
  startedAt: string
  submittedAt: string | null
  scenario: {
    id: string
    title: string
    ticketContext: string
    language: string
    difficulty: string
    category: string
    persona: BuiltScenario['persona']
    files: DiffFile[]
    groundTruth: GroundTruthItem[]
  }
  comments: (SubmittedComment & CommentVerdict)[]
}

export interface AttemptSummary {
  id: string
  title: string
  language: string
  category: string
  difficulty: string
  score: number
  submittedAt: string
}

/** Partie ouverte mais pas encore soumise, que le joueur peut reprendre. */
export interface AttemptInProgressSummary {
  id: string
  title: string
  language: string
  category: string | null
  difficulty: string | null
  isMystery: boolean
  startedAt: string
}

export interface ChallengesRepo {
  findUnplayedScenario(userId: string, params: GenerationParams): Promise<string | null>
  insertScenario(userId: string, outcome: { scenario: BuiltScenario; params: GenerationParams; source: string; model: string }): Promise<string>
  createAttempt(userId: string, scenarioId: string, isMystery: boolean): Promise<string>
  getAttempt(attemptId: string, userId: string): Promise<AttemptRecord | null>
  /** Renvoie false si la tentative était déjà soumise (double clic, second onglet). */
  saveJudgement(
    attemptId: string,
    judgement: { score: number; breakdown: ScoreBreakdown; summary: string; judgedBy: string },
    comments: (SubmittedComment & CommentVerdict)[],
  ): Promise<boolean>
  listSubmitted(userId: string): Promise<AttemptSummary[]>
  listInProgress(userId: string): Promise<AttemptInProgressSummary[]>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createChallengesRepo(pool: pg.Pool): ChallengesRepo {
  return {
    async findUnplayedScenario(userId, params) {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT s.id FROM scenarios s
          WHERE s.language = $1 AND s.difficulty = $2 AND s.error_category = $3 AND s.locale = $5
            AND NOT EXISTS (
              SELECT 1 FROM review_attempts a WHERE a.scenario_id = s.id AND a.user_id = $4)
          ORDER BY random() LIMIT 1`,
        [params.language, params.difficulty, params.category, userId, params.locale],
      )
      return rows[0]?.id ?? null
    },

    async insertScenario(userId, { scenario, params, source, model }) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO scenarios (created_by_user_id, title, ticket_context, language, difficulty,
                                error_category, persona, diff_content, ground_truth, source, model, locale)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          userId,
          scenario.title.slice(0, 255),
          scenario.ticketContext,
          params.language,
          params.difficulty,
          params.category,
          JSON.stringify(scenario.persona),
          JSON.stringify(scenario.files),
          JSON.stringify(scenario.groundTruth),
          source,
          model,
          params.locale,
        ],
      )
      return rows[0]!.id
    },

    async createAttempt(userId, scenarioId, isMystery) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO review_attempts (user_id, scenario_id, is_mystery) VALUES ($1, $2, $3) RETURNING id`,
        [userId, scenarioId, isMystery],
      )
      return rows[0]!.id
    },

    async getAttempt(attemptId, userId) {
      // Sans ce contrôle, un identifiant mal formé ferait lever une erreur
      // de cast PostgreSQL, renvoyée en 500 au lieu d'un 404.
      if (!UUID.test(attemptId)) return null
      const { rows } = await pool.query(
        `SELECT a.id, a.status, a.is_mystery, a.score, a.score_breakdown, a.ai_summary, a.judged_by,
                a.created_at, a.submitted_at,
                s.id AS scenario_id, s.title, s.ticket_context, s.language, s.difficulty::text AS difficulty,
                s.error_category::text AS category, s.persona, s.diff_content, s.ground_truth
           FROM review_attempts a JOIN scenarios s ON s.id = a.scenario_id
          WHERE a.id = $1 AND a.user_id = $2`,
        [attemptId, userId],
      )
      const row = rows[0]
      if (!row) return null

      const comments = await pool.query(
        `SELECT file_path, line_number, user_text, matched_issue_id, clarity_score, eval_feedback
           FROM user_comments WHERE attempt_id = $1 ORDER BY file_path, line_number`,
        [attemptId],
      )

      return {
        id: row.id,
        status: row.status,
        isMystery: row.is_mystery,
        score: row.score,
        scoreBreakdown: row.score_breakdown,
        aiSummary: row.ai_summary,
        judgedBy: row.judged_by,
        startedAt: row.created_at.toISOString(),
        submittedAt: row.submitted_at?.toISOString() ?? null,
        scenario: {
          id: row.scenario_id,
          title: row.title,
          ticketContext: row.ticket_context,
          language: row.language,
          difficulty: row.difficulty,
          category: row.category,
          persona: row.persona,
          files: JSON.parse(row.diff_content),
          groundTruth: row.ground_truth,
        },
        comments: comments.rows.map((c) => ({
          file_path: c.file_path,
          line_number: c.line_number,
          text: c.user_text,
          matched_issue_id: c.matched_issue_id,
          clarity_score: c.clarity_score ?? 0,
          feedback: c.eval_feedback ?? '',
        })),
      }
    },

    async saveJudgement(attemptId, judgement, comments) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const updated = await client.query(
          `UPDATE review_attempts
              SET status = 'submitted', score = $2, score_breakdown = $3, ai_summary = $4,
                  judged_by = $5, submitted_at = now()
            WHERE id = $1 AND status = 'in_progress'`,
          [attemptId, judgement.score, JSON.stringify(judgement.breakdown), judgement.summary, judgement.judgedBy],
        )
        if (updated.rowCount === 0) {
          await client.query('ROLLBACK')
          return false
        }
        for (const c of comments) {
          await client.query(
            `INSERT INTO user_comments (attempt_id, file_path, line_number, user_text,
                                        matched_ground_truth, matched_issue_id, clarity_score, eval_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [attemptId, c.file_path, c.line_number, c.text, c.matched_issue_id !== null,
             c.matched_issue_id, c.clarity_score, c.feedback],
          )
        }
        await client.query('COMMIT')
        return true
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },

    async listInProgress(userId) {
      const { rows } = await pool.query(
        `SELECT a.id, a.is_mystery, a.created_at, s.title, s.language,
                s.error_category::text AS category, s.difficulty::text AS difficulty
           FROM review_attempts a JOIN scenarios s ON s.id = a.scenario_id
          WHERE a.user_id = $1 AND a.status = 'in_progress'
          ORDER BY a.created_at DESC`,
        [userId],
      )
      // Le mode Mystère ne dévoile ni la difficulté ni la catégorie avant la soumission.
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        language: r.language,
        category: r.is_mystery ? null : r.category,
        difficulty: r.is_mystery ? null : r.difficulty,
        isMystery: r.is_mystery,
        startedAt: r.created_at.toISOString(),
      }))
    },

    async listSubmitted(userId) {
      const { rows } = await pool.query(
        `SELECT a.id, s.title, s.language, s.error_category::text AS category,
                s.difficulty::text AS difficulty, a.score, a.submitted_at
           FROM review_attempts a JOIN scenarios s ON s.id = a.scenario_id
          WHERE a.user_id = $1 AND a.status = 'submitted'
          ORDER BY a.submitted_at`,
        [userId],
      )
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        language: r.language,
        category: r.category,
        difficulty: r.difficulty,
        score: r.score,
        submittedAt: r.submitted_at.toISOString(),
      }))
    },
  }
}
