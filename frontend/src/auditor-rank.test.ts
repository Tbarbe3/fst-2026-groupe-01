import { describe, expect, it } from 'vitest'

import { getAuditorRank } from './auditor-rank'
import { translate } from './i18n'

const t = (key: string, params?: Record<string, string | number>) => translate('fr', key, params)
const passed = (n: number, score = 70) => Array.from({ length: n }, () => score)

describe('getAuditorRank', () => {
  it.each([
    [0, 'Novice', 0, '5 revues réussies restantes pour débloquer le rang d’Apprenti.'],
    [4, 'Novice', 80, '1 revue réussie restante pour débloquer le rang d’Apprenti.'],
    [5, 'Apprenti Reviewer', 0, '5 revues réussies restantes pour passer Reviewer Confirmé.'],
    [15, 'Reviewer Confirmé', 50, '5 revues réussies avant d’atteindre le rang d’Auditeur Senior.'],
  ])('%i revue(s) réussie(s) : %s', (count, title, progress, desc) => {
    expect(getAuditorRank(passed(count), t)).toEqual({ title, progress, desc })
  })

  it('ne compte pas les revues sous 50/100', () => {
    expect(getAuditorRank([...passed(4), ...passed(10, 30)], t).title).toBe('Novice')
    expect(getAuditorRank([...passed(4), 50], t).title).toBe('Apprenti Reviewer')
  })

  it('plafonne au rang Senior avec la moyenne de toutes les revues', () => {
    expect(getAuditorRank([...passed(20, 90), 30], t)).toEqual({
      title: 'Auditeur Senior 🏆',
      progress: 100,
      desc: 'Expert de la revue de code avec 87% de score moyen.',
    })
  })
})
