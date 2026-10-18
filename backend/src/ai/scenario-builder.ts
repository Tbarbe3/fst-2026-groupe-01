import {
  CATEGORIES,
  SEVERITIES,
  type BuiltScenario,
  type DiffFile,
  type DiffLine,
  type GeneratedScenario,
  type GroundTruthItem,
} from './types.js'

const MAX_FILES = 4
const MAX_LINES = 160
const MAX_LINE_LENGTH = 200
const MAX_ISSUES = 3

// Un commentaire « // faille XSS ici » donnerait la réponse : on ne
// cherche ces mots que dans la partie commentaire de la ligne.
const COMMENT_PART = /(?:\/\/|#|\/\*|--)(.*)$/
const HINT_WORDS =
  /\b(bug|bogue|vuln\w*|faille|insecure|unsafe|injection|xss|fixme|hack|race|leak|fuite|n\+1)\b/i

export class ScenarioValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`Scénario généré invalide : ${problems.join(' ; ')}`)
    this.name = 'ScenarioValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Valide la sortie brute du modèle (structure comprise : on ne fait pas
 * confiance au Structured Output) et calcule numéros de ligne et ground truth.
 */
export function buildScenario(raw: unknown): BuiltScenario {
  const problems: string[] = []
  if (!isRecord(raw)) throw new ScenarioValidationError(['la sortie n’est pas un objet'])

  const scenario = raw as unknown as GeneratedScenario
  if (!nonEmpty(scenario.title)) problems.push('titre manquant')
  if (!nonEmpty(scenario.ticket_context)) problems.push('contexte du ticket manquant')
  if (!isRecord(scenario.persona) || !nonEmpty(scenario.persona.name)) {
    problems.push('persona manquant')
  }
  if (!Array.isArray(scenario.files) || scenario.files.length === 0) {
    problems.push('aucun fichier')
  } else if (scenario.files.length > MAX_FILES) {
    problems.push(`plus de ${MAX_FILES} fichiers`)
  }
  if (!Array.isArray(scenario.issues) || scenario.issues.length === 0) {
    problems.push('aucune anomalie')
  } else if (scenario.issues.length > MAX_ISSUES) {
    problems.push(`plus de ${MAX_ISSUES} anomalies`)
  }
  if (problems.length > 0) throw new ScenarioValidationError(problems)

  const issueIds = new Set<string>()
  for (const issue of scenario.issues) {
    if (!nonEmpty(issue.id) || issueIds.has(issue.id)) {
      problems.push(`identifiant d’anomalie absent ou dupliqué (${String(issue.id)})`)
      continue
    }
    issueIds.add(issue.id)
    if (!CATEGORIES.includes(issue.type)) problems.push(`catégorie inconnue : ${issue.type}`)
    if (!SEVERITIES.includes(issue.severity)) problems.push(`criticité inconnue : ${issue.severity}`)
    if (!nonEmpty(issue.expected_issue) || !nonEmpty(issue.why)) {
      problems.push(`anomalie ${issue.id} sans description`)
    }
  }

  const referenced = new Map<string, { file: string; lines: number[] }>()
  const files: DiffFile[] = []
  let totalLines = 0

  for (const file of scenario.files) {
    if (!nonEmpty(file.path) || !Array.isArray(file.hunks) || file.hunks.length === 0) {
      problems.push('fichier sans chemin ou sans bloc')
      continue
    }
    const lines: DiffLine[] = []

    for (const hunk of file.hunks) {
      if (!Array.isArray(hunk.lines) || hunk.lines.length === 0) {
        problems.push(`bloc vide dans ${file.path}`)
        continue
      }
      const start = Number.isInteger(hunk.start_line) && hunk.start_line > 0 ? hunk.start_line : 1
      let oldLine = start
      let newLine = start
      const oldCount = hunk.lines.filter((l) => l.kind !== 'add').length
      const newCount = hunk.lines.filter((l) => l.kind !== 'delete').length
      lines.push({ type: 'hunk', code: `@@ -${start},${oldCount} +${start},${newCount} @@` })

      for (const line of hunk.lines) {
        totalLines++
        if (typeof line.text !== 'string') {
          problems.push(`ligne sans texte dans ${file.path}`)
          continue
        }
        if (line.text.length > MAX_LINE_LENGTH) problems.push(`ligne trop longue dans ${file.path}`)
        const comment = COMMENT_PART.exec(line.text)?.[1]
        if (comment && HINT_WORDS.test(comment)) {
          problems.push(`indice révélé dans un commentaire de ${file.path} : « ${line.text.trim()} »`)
        }

        if (line.kind === 'delete') {
          lines.push({ type: 'delete', code: line.text, oldLineNumber: oldLine++ })
        } else if (line.kind === 'add') {
          lines.push({ type: 'add', code: line.text, newLineNumber: newLine })
        } else if (line.kind === 'context') {
          lines.push({ type: 'context', code: line.text, oldLineNumber: oldLine++, newLineNumber: newLine })
        } else {
          problems.push(`type de ligne inconnu : ${String(line.kind)}`)
          continue
        }

        if (line.issue_ref) {
          if (line.kind !== 'add') {
            problems.push(`anomalie ${line.issue_ref} rattachée à une ligne non ajoutée`)
          } else if (!issueIds.has(line.issue_ref)) {
            problems.push(`référence à une anomalie inconnue : ${line.issue_ref}`)
          } else {
            const ref = referenced.get(line.issue_ref)
            if (ref && ref.file !== file.path) {
              problems.push(`anomalie ${line.issue_ref} répartie sur plusieurs fichiers`)
            } else if (ref) {
              ref.lines.push(newLine)
            } else {
              referenced.set(line.issue_ref, { file: file.path, lines: [newLine] })
            }
          }
        }
        if (line.kind !== 'delete') newLine++
      }
    }
    files.push({ path: file.path, lines })
  }

  if (totalLines > MAX_LINES) problems.push(`plus de ${MAX_LINES} lignes de diff`)
  for (const id of issueIds) {
    if (!referenced.has(id)) problems.push(`anomalie ${id} rattachée à aucune ligne`)
  }
  if (problems.length > 0) throw new ScenarioValidationError(problems)

  const groundTruth: GroundTruthItem[] = scenario.issues.map((issue) => {
    const ref = referenced.get(issue.id)!
    return {
      id: issue.id,
      file: ref.file,
      line_number: ref.lines[0]!,
      lines: ref.lines,
      type: issue.type,
      severity: issue.severity,
      expected_issue: issue.expected_issue,
      why: issue.why,
      ideal_fix: issue.ideal_fix ?? '',
      fixed_lines: Array.isArray(issue.fixed_lines) ? issue.fixed_lines : [],
    }
  })

  return {
    title: scenario.title.trim(),
    ticketContext: scenario.ticket_context.trim(),
    persona: {
      name: scenario.persona.name.trim(),
      archetype: scenario.persona.archetype ?? '',
      bio: scenario.persona.bio ?? '',
    },
    files,
    groundTruth,
  }
}
