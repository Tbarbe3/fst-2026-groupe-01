import { describe, expect, it } from 'vitest'

import { MOCK_CATALOG, localizedScenario, pickCatalogEntry } from './mock-catalog.js'
import { DIFFICULTIES, LANGUAGES } from './types.js'
import { createMockProvider } from './provider.js'
import { buildScenario } from './scenario-builder.js'

describe('pickCatalogEntry', () => {
  it('privilégie une entrée du même langage et de la même catégorie', () => {
    const target = MOCK_CATALOG[0]!
    const entry = pickCatalogEntry(target, () => 0)
    expect(entry.language).toBe(target.language)
    expect(entry.category).toBe(target.category)
  })

  // Symptôme d'origine : un joueur qui demandait du Rust recevait du Java.
  it.each(LANGUAGES)('sert toujours un scénario en %s, quel que soit le niveau', (language) => {
    for (const difficulty of DIFFICULTIES) {
      const entry = pickCatalogEntry({ language, difficulty, category: 'performance' }, () => 0)
      expect(entry.language).toBe(language)
    }
  })

  it.each(LANGUAGES)('propose un scénario de niveau 1 ou 2 en %s', (language) => {
    expect(MOCK_CATALOG.some((e) => e.language === language && Number(e.difficulty) <= 2)).toBe(true)
  })

  it('préfère un niveau inférieur à un niveau supérieur', () => {
    // Python existe aux niveaux 1 et 4 : un niveau 3 doit tomber sur le 4 (le plus proche),
    // un niveau 2 sur le 1 (plus proche, et en dessous).
    expect(pickCatalogEntry({ language: 'python', difficulty: '2', category: 'performance' }).difficulty).toBe('1')
    expect(pickCatalogEntry({ language: 'python', difficulty: '3', category: 'performance' }).difficulty).toBe('4')
  })

  it('retient le niveau exact quand il existe', () => {
    const entry = pickCatalogEntry({ language: 'go', difficulty: '5', category: 'performance' })
    expect(entry.difficulty).toBe('5')
  })

  it.each(MOCK_CATALOG.map((e) => [e.language, e.difficulty, e] as const))(
    'l’entrée %s de niveau %s passe la validation du constructeur',
    (_, __, entry) => {
      expect(() => buildScenario(structuredClone(entry.scenario))).not.toThrow()
      expect(() => buildScenario(localizedScenario(entry, 'en'))).not.toThrow()
    },
  )

  it('renvoie toujours une entrée, même sans correspondance', () => {
    const entry = pickCatalogEntry(
      { language: 'cobol' as never, difficulty: '3', category: 'inexistante' as never },
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
    const scenario = await provider.generateScenario({ ...MOCK_CATALOG[0]!, locale: 'fr' }, 0.7)
    expect(scenario).toEqual(MOCK_CATALOG[0]!.scenario)
    expect(scenario).not.toBe(MOCK_CATALOG[0]!.scenario)
  })

  it('traduit les textes du scénario sans toucher au code', async () => {
    const entry = MOCK_CATALOG[0]!
    const scenario = (await provider.generateScenario({ ...entry, locale: 'en' }, 0.7)) as typeof entry.scenario
    expect(scenario.title).toBe(entry.en.title)
    expect(scenario.issues[0]!.why).toBe(entry.en.issues.I1!.why)
    expect(scenario.files).toEqual(entry.scenario.files)
  })

  it.each(MOCK_CATALOG.map((e) => [e.scenario.title, e] as const))('traduit toutes les anomalies de « %s »', (_, entry) => {
    expect(Object.keys(entry.en.issues).sort()).toEqual(entry.scenario.issues.map((i) => i.id).sort())
  })

  it('rédige ses retours en anglais à la demande', async () => {
    const result = (await provider.judge({
      groundTruth: built.groundTruth,
      comments: [{ file_path: 'inconnu.ts', line_number: 999, text: 'Remark' }],
      codeLines: [''],
      locale: 'en',
    })) as { summary: string; verdicts: { feedback: string }[] }

    expect(result.summary).toMatch(/^\[Simulated mode\]/)
    expect(result.verdicts[0]!.feedback).toMatch(/does not contain an expected flaw/)
  })

  it('rattache un commentaire posé sur la bonne ligne', async () => {
    const result = (await provider.judge({
      groundTruth: built.groundTruth,
      comments: [{ file_path: issue.file, line_number: issue.line_number, text: issue.why }],
      codeLines: [''],
      locale: 'fr',
    })) as { verdicts: { matched_issue_id: string; clarity_score: number }[] }

    expect(result.verdicts[0]!.matched_issue_id).toBe(issue.id)
    expect(result.verdicts[0]!.clarity_score).toBeGreaterThan(35)
  })

  it('note zéro un commentaire hors anomalie', async () => {
    const result = (await provider.judge({
      groundTruth: built.groundTruth,
      comments: [{ file_path: 'inconnu.ts', line_number: 999, text: 'Remarque' }],
      codeLines: [''],
      locale: 'fr',
    })) as { verdicts: { matched_issue_id: string; clarity_score: number }[] }

    expect(result.verdicts[0]).toMatchObject({ matched_issue_id: '', clarity_score: 0 })
  })
})
