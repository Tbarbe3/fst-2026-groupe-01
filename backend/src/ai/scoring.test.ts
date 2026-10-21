import { describe, expect, it } from 'vitest'

import { MESSAGES } from './messages.js'
import {
  candidateIssues,
  computeScore,
  heuristicJudge,
  sanitizeJudgeOutput,
} from './scoring.js'
import type { GroundTruthItem, SubmittedComment } from './types.js'

const GT: GroundTruthItem[] = [
  {
    id: 'I1', file: 'a.ts', line_number: 20, lines: [20], type: 'security_owasp', severity: 'critical',
    expected_issue: 'Signature non vérifiée', why: '…', ideal_fix: '…', fixed_lines: [],
  },
  {
    id: 'I2', file: 'a.ts', line_number: 40, lines: [40, 41], type: 'performance', severity: 'minor',
    expected_issue: 'N+1', why: '…', ideal_fix: '…', fixed_lines: [],
  },
]

const comment = (line_number: number, file_path = 'a.ts'): SubmittedComment => ({
  file_path, line_number, text: 'remarque',
})

describe('candidateIssues', () => {
  it('tolère deux lignes d’écart', () => {
    expect(candidateIssues(comment(22), GT)).toEqual(['I1'])
    expect(candidateIssues(comment(23), GT)).toEqual([])
  })

  it('exige le même fichier', () => {
    expect(candidateIssues(comment(20, 'b.ts'), GT)).toEqual([])
  })
})

describe('sanitizeJudgeOutput', () => {
  // Garde-fou contre l'injection de prompt : même si le juge est convaincu
  // par le texte du commentaire, il ne peut pas valider une ligne hors cible.
  it('rejette une correspondance hors des candidats', () => {
    const result = sanitizeJudgeOutput(
      { summary: 's', verdicts: [{ comment_index: 0, matched_issue_id: 'I1', clarity_score: 100, feedback: 'ok' }] },
      [comment(5)],
      GT,
      'fr',
    )
    expect(result.verdicts[0]).toMatchObject({ matched_issue_id: null, clarity_score: 0 })
  })

  it('borne la note de clarté', () => {
    const result = sanitizeJudgeOutput(
      { summary: 's', verdicts: [{ comment_index: 0, matched_issue_id: 'I1', clarity_score: 400, feedback: 'ok' }] },
      [comment(20)],
      GT,
      'fr',
    )
    expect(result.verdicts[0].clarity_score).toBe(100)
  })

  it('traite une chaîne vide comme une absence de correspondance', () => {
    const result = sanitizeJudgeOutput(
      { summary: 's', verdicts: [{ comment_index: 0, matched_issue_id: '', clarity_score: 80, feedback: 'non' }] },
      [comment(20)],
      GT,
      'fr',
    )
    expect(result.verdicts[0].matched_issue_id).toBeNull()
  })

  it('lève sur une sortie mal formée', () => {
    expect(() => sanitizeJudgeOutput({ verdicts: 'x' }, [comment(20)], GT, 'fr')).toThrow()
  })
})

describe('heuristicJudge', () => {
  it('associe par la ligne seule et annonce le mode dégradé', () => {
    const result = heuristicJudge([comment(41), comment(99)], GT, 'fr')
    expect(result.summary).toBe(MESSAGES.fr.heuristicSummary)
    expect(result.verdicts.map((v) => v.matched_issue_id)).toEqual(['I2', null])
  })

  it('rédige ses retours dans la langue du joueur', () => {
    const result = heuristicJudge([comment(99)], GT, 'en')
    expect(result.summary).toBe(MESSAGES.en.heuristicSummary)
    expect(result.verdicts[0]!.feedback).toBe(MESSAGES.en.heuristicMissed)
  })
})

describe('computeScore', () => {
  it('donne 100 pour tout trouvé, parfaitement expliqué, sans faux positif', () => {
    const { score } = computeScore(GT, [
      { matched_issue_id: 'I1', clarity_score: 100, feedback: '' },
      { matched_issue_id: 'I2', clarity_score: 100, feedback: '' },
    ])
    expect(score).toBe(100)
  })

  it('pondère la détection par la criticité', () => {
    const { breakdown } = computeScore(GT, [{ matched_issue_id: 'I1', clarity_score: 0, feedback: '' }])
    expect(breakdown.detection).toBe(45)
    expect(breakdown.found_criticals).toBe(1)
  })

  it('retire 5 points de précision par faux positif', () => {
    const { breakdown } = computeScore(GT, [
      { matched_issue_id: 'I1', clarity_score: 50, feedback: '' },
      { matched_issue_id: null, clarity_score: 0, feedback: '' },
    ])
    expect(breakdown.false_positives).toBe(1)
    expect(breakdown.precision).toBe(5)
  })

  it('ne compte pas deux fois une anomalie commentée deux fois', () => {
    const { breakdown } = computeScore(GT, [
      { matched_issue_id: 'I2', clarity_score: 50, feedback: '' },
      { matched_issue_id: 'I2', clarity_score: 50, feedback: '' },
    ])
    expect(breakdown.found).toBe(1)
    expect(breakdown.false_positives).toBe(0)
  })

  // Approuver une PR sans la lire ne doit pas rapporter les points de précision.
  it('donne 0 à une revue sans commentaire', () => {
    expect(computeScore(GT, []).score).toBe(0)
  })
})
