import { describe, expect, it } from 'vitest'

import { MOCK_CATALOG, pickCatalogEntry } from './mock-catalog.js'
import { createMockProvider } from './provider.js'
import { buildScenario } from './scenario-builder.js'

describe('pickCatalogEntry', () => {
  it('privilégie une entrée du même langage et de la même catégorie', () => {
    const target = MOCK_CATALOG[0]!
    const entry = pickCatalogEntry(target, () => 0)
    expect(entry.language).toBe(target.language)
    expect(entry.category).toBe(target.category)
  })

  it('renvoie toujours une entrée, même sans correspondance', () => {
    const entry = pickCatalogEntry(
      { language: 'cobol' as never, difficulty: 'junior', category: 'inexistante' as never },
      () => 0.99,
    )
    expect(MOCK_CATALOG).toContain(entry)
  })
})

describe('createMockProvider', () => {
  const provider = createMockProvider(0)
  const built = buildScenario(MOCK_CATALOG[0]!.scenario)
  const issue = built.groundTruth[0]!

  it('génère une copie du scénario du catalogue', async () => {
    const scenario = await provider.generateScenario(MOCK_CATALOG[0]!, 0.7)
    expect(scenario).toEqual(MOCK_CATALOG[0]!.scenario)
    expect(scenario).not.toBe(MOCK_CATALOG[0]!.scenario)
  })

  it('rattache un commentaire posé sur la bonne ligne', async () => {
    const result = (await provider.judge({
      groundTruth: built.groundTruth,
      comments: [{ file_path: issue.file, line_number: issue.line_number, text: issue.why }],
      codeLines: [''],
    })) as { verdicts: { matched_issue_id: string; clarity_score: number }[] }

    expect(result.verdicts[0]!.matched_issue_id).toBe(issue.id)
    expect(result.verdicts[0]!.clarity_score).toBeGreaterThan(35)
  })

  it('note zéro un commentaire hors anomalie', async () => {
    const result = (await provider.judge({
      groundTruth: built.groundTruth,
      comments: [{ file_path: 'inconnu.ts', line_number: 999, text: 'Remarque' }],
      codeLines: [''],
    })) as { verdicts: { matched_issue_id: string; clarity_score: number }[] }

    expect(result.verdicts[0]).toMatchObject({ matched_issue_id: '', clarity_score: 0 })
  })
})
