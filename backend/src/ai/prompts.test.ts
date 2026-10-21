import { describe, expect, it } from 'vitest'

import { generatorPrompt, judgePrompt } from './prompts.js'
import { DIFFICULTIES } from './types.js'

describe('generatorPrompt', () => {
  it('demande une erreur de syntaxe au niveau 1', () => {
    const prompt = generatorPrompt({ language: 'java', difficulty: '1', category: 'business_logic', locale: 'fr' })
    expect(prompt).toContain('niveau 1 sur 5')
    expect(prompt).toMatch(/SYNTAXE/)
    expect(prompt).toMatch(/point-virgule/)
  })

  it.each(DIFFICULTIES)('décrit le niveau %s', (level) => {
    const prompt = generatorPrompt({ language: 'go', difficulty: level, category: 'performance', locale: 'fr' })
    expect(prompt).toContain(`niveau ${level} sur 5`)
    expect(prompt).not.toContain('undefined')
  })

  it('demande la rédaction dans la langue du joueur', () => {
    expect(generatorPrompt({ language: 'go', difficulty: '3', category: 'performance', locale: 'en' })).toContain(
      'Langue de rédaction : anglais',
    )
  })
})

describe('judgePrompt', () => {
  it('transmet la langue attendue des retours', () => {
    expect(JSON.parse(judgePrompt('en', [], [])).language).toMatch(/anglais/)
  })
})
