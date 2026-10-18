import { describe, expect, it } from 'vitest'

import { MOCK_CATALOG } from './mock-catalog.js'
import { ScenarioValidationError, buildScenario } from './scenario-builder.js'
import type { GeneratedScenario } from './types.js'

function scenario(overrides: Partial<GeneratedScenario> = {}): GeneratedScenario {
  return {
    title: 'PR #1',
    ticket_context: 'Contexte',
    persona: { name: 'Kevin', archetype: 'junior', bio: 'Bio' },
    files: [
      {
        path: 'src/a.ts',
        hunks: [
          {
            start_line: 10,
            lines: [
              { kind: 'context', text: 'const a = 1' },
              { kind: 'delete', text: 'const b = 2' },
              { kind: 'add', text: 'const b = 3' },
              { kind: 'add', text: 'el.innerHTML = query', issue_ref: 'I1' },
              { kind: 'context', text: 'export { a }' },
            ],
          },
        ],
      },
    ],
    issues: [
      {
        id: 'I1',
        type: 'security_owasp',
        severity: 'critical',
        expected_issue: 'XSS',
        why: 'Injection de HTML',
        ideal_fix: 'textContent',
        fixed_lines: ['el.textContent = query'],
      },
    ],
    ...overrides,
  }
}

function problemsOf(raw: unknown): string[] {
  try {
    buildScenario(raw)
  } catch (error) {
    if (error instanceof ScenarioValidationError) return error.problems
    throw error
  }
  return []
}

describe('buildScenario', () => {
  it('calcule les numéros de ligne à partir du début de bloc', () => {
    const built = buildScenario(scenario())
    const lines = built.files[0].lines

    expect(lines[0]).toEqual({ type: 'hunk', code: '@@ -10,3 +10,4 @@' })
    expect(lines[1]).toMatchObject({ type: 'context', oldLineNumber: 10, newLineNumber: 10 })
    expect(lines[2]).toMatchObject({ type: 'delete', oldLineNumber: 11 })
    expect(lines[2].newLineNumber).toBeUndefined()
    expect(lines[3]).toMatchObject({ type: 'add', newLineNumber: 11 })
    expect(lines[5]).toMatchObject({ type: 'context', oldLineNumber: 12, newLineNumber: 13 })
  })

  it('situe la ground truth sur la ligne ajoutée référencée', () => {
    const [issue] = buildScenario(scenario()).groundTruth
    expect(issue).toMatchObject({ id: 'I1', file: 'src/a.ts', line_number: 12, lines: [12] })
  })

  // Le modèle peut annoncer une anomalie sans la placer dans le code : le
  // joueur chercherait alors une erreur inexistante.
  it('refuse une anomalie rattachée à aucune ligne', () => {
    const raw = scenario()
    raw.files[0].hunks[0].lines[3].issue_ref = null
    expect(problemsOf(raw)).toContain('anomalie I1 rattachée à aucune ligne')
  })

  it('refuse une référence à une anomalie inconnue', () => {
    const raw = scenario()
    raw.files[0].hunks[0].lines[2].issue_ref = 'I9'
    expect(problemsOf(raw).join()).toMatch(/inconnue : I9/)
  })

  it('refuse une anomalie posée sur une ligne de contexte', () => {
    const raw = scenario()
    raw.files[0].hunks[0].lines[0].issue_ref = 'I1'
    expect(problemsOf(raw).join()).toMatch(/non ajoutée/)
  })

  it('refuse un commentaire de code qui trahit la réponse', () => {
    const raw = scenario()
    raw.files[0].hunks[0].lines[3].text = 'el.innerHTML = query // TODO faille XSS'
    expect(problemsOf(raw).join()).toMatch(/indice révélé/)
  })

  it('n’interprète pas un mot-clé hors commentaire comme un indice', () => {
    const raw = scenario()
    raw.files[0].hunks[0].lines[2].text = 'const unsafeCount = 3'
    expect(problemsOf(raw)).toEqual([])
  })

  it('refuse une sortie qui n’est pas un objet', () => {
    expect(problemsOf('du texte')).toHaveLength(1)
    expect(problemsOf({ title: 'x' }).length).toBeGreaterThan(0)
  })

  // Le catalogue sert de repli quand Gemini échoue : un scénario invalide
  // ferait échouer la création du challenge au pire moment.
  it.each(MOCK_CATALOG.map((e) => [e.scenario.title, e] as const))(
    'valide le scénario du catalogue « %s »',
    (_title, entry) => {
      const built = buildScenario(structuredClone(entry.scenario))
      expect(built.groundTruth.length).toBeGreaterThan(0)
    },
  )
})
