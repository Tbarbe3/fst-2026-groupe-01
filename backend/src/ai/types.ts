export const LANGUAGES = ['typescript', 'python', 'go', 'java', 'php', 'rust', 'csharp'] as const
export const DIFFICULTIES = ['junior', 'intermediate', 'senior'] as const
// Doit rester aligné sur le type PostgreSQL `error_category_type`.
export const CATEGORIES = [
  'security_owasp',
  'performance',
  'architecture',
  'race_condition',
  'business_logic',
] as const
export const SEVERITIES = ['critical', 'major', 'minor'] as const

export type Language = (typeof LANGUAGES)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]
export type Category = (typeof CATEGORIES)[number]
export type Severity = (typeof SEVERITIES)[number]

export interface GenerationParams {
  language: Language
  difficulty: Difficulty
  category: Category
}

/**
 * Format demandé au modèle : des lignes typées, sans aucun numéro de ligne
 * absolu hors du début de bloc. Les numéros sont recalculés côté serveur,
 * un LLM comptant mal les lignes.
 */
export interface GeneratedScenario {
  title: string
  ticket_context: string
  persona: { name: string; archetype: string; bio: string }
  files: {
    path: string
    hunks: {
      start_line: number
      lines: { kind: 'context' | 'add' | 'delete'; text: string; issue_ref?: string | null }[]
    }[]
  }[]
  issues: {
    id: string
    type: Category
    severity: Severity
    expected_issue: string
    why: string
    ideal_fix: string
    fixed_lines: string[]
  }[]
}

// Mêmes noms de champs que le DiffLine de la page d'accueil : un seul
// composant de rendu sert la démo et le jeu.
export interface DiffLine {
  type: 'context' | 'add' | 'delete' | 'hunk'
  code: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffFile {
  path: string
  lines: DiffLine[]
}

export interface GroundTruthItem {
  id: string
  file: string
  line_number: number
  lines: number[]
  type: Category
  severity: Severity
  expected_issue: string
  why: string
  ideal_fix: string
  fixed_lines: string[]
}

export interface BuiltScenario {
  title: string
  ticketContext: string
  persona: GeneratedScenario['persona']
  files: DiffFile[]
  groundTruth: GroundTruthItem[]
}

export interface SubmittedComment {
  file_path: string
  line_number: number
  text: string
}

export interface CommentVerdict {
  matched_issue_id: string | null
  clarity_score: number
  feedback: string
}

export interface JudgeResult {
  summary: string
  verdicts: CommentVerdict[]
}
