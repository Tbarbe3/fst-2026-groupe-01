import { describe, expect, it } from 'vitest'

import { getAuditorRank } from './auditor-rank'
import { translate } from './i18n'

const t = (key: string, params?: Record<string, string | number>) => translate('fr', key, params)

describe('getAuditorRank', () => {
  it.each([
    [0, 'Novice', 0, '5 revues restantes pour débloquer le rang d’Apprenti.'],
    [4, 'Novice', 80, '1 revue restante pour débloquer le rang d’Apprenti.'],
    [5, 'Apprenti Reviewer', 0, '5 revues restantes pour passer Reviewer Confirmé.'],
    [15, 'Reviewer Confirmé', 50, '5 revues avant d’atteindre le rang d’Auditeur Senior.'],
  ])('%i revue(s) : %s', (count, title, progress, desc) => {
    expect(getAuditorRank(count, 70, t)).toEqual({ title, progress, desc })
  })

  it('plafonne au rang Senior avec le score moyen', () => {
    expect(getAuditorRank(42, 87, t)).toEqual({
      title: 'Auditeur Senior 🏆',
      progress: 100,
      desc: 'Expert de la revue de code avec 87% de score moyen.',
    })
  })
})
