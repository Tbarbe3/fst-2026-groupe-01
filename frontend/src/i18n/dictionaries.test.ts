import { describe, expect, it } from 'vitest'

import { en } from './en'
import { fr } from './fr'
import {
  DEMO_SCENARIOS_EN,
  DEMO_SCENARIOS_FR,
  SUPPORTED_LANGUAGES_EN,
  SUPPORTED_LANGUAGES_FR,
} from './scenarios'

const entries = (obj: object, prefix = ''): [string, unknown][] =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? entries(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  )

describe('dictionnaires', () => {
  const frEntries = new Map(entries(fr))
  const enEntries = new Map(entries(en))

  it('déclarent les mêmes clés en français et en anglais', () => {
    expect([...enEntries.keys()].sort()).toEqual([...frEntries.keys()].sort())
  })

  it('ne contiennent aucune traduction vide', () => {
    const empty = [...frEntries, ...enEntries].filter(([, v]) => typeof v !== 'string' || !v.trim())
    expect(empty).toEqual([])
  })

  it('proposent les mêmes démos et langages dans les deux langues', () => {
    const shape = (items: object[]) => items.map((item) => [...new Map(entries(item)).keys()].sort())
    expect(shape(DEMO_SCENARIOS_EN)).toEqual(shape(DEMO_SCENARIOS_FR))
    expect(shape(SUPPORTED_LANGUAGES_EN)).toEqual(shape(SUPPORTED_LANGUAGES_FR))
  })

  it('utilisent les mêmes paramètres dans les deux langues', () => {
    const params = (v: unknown) => [...new Set([...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort()
    for (const [key, value] of frEntries) {
      expect(params(enEntries.get(key)), key).toEqual(params(value))
    }
  })
})
