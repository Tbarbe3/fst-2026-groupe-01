import { describe, expect, it } from 'vitest'

import { describeDatabaseError } from './errors.js'

describe('describeDatabaseError', () => {
  // Le cas qui motive cette fonction : pg lève un AggregateError au message
  // vide quand toutes les adresses résolues échouent. Sans traitement, le log
  // affichait « Base injoignable () », sans la moindre indication.
  it('utilise le code quand le message est vide', () => {
    const error = new AggregateError([], '')
    Object.assign(error, { code: 'ECONNREFUSED' })

    expect(describeDatabaseError(error)).toBe('ECONNREFUSED')
  })

  it('combine code et message quand les deux existent', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:5432')
    Object.assign(error, { code: 'ECONNREFUSED' })

    expect(describeDatabaseError(error)).toBe(
      'ECONNREFUSED — connect ECONNREFUSED 127.0.0.1:5432',
    )
  })

  it('se contente du message en l’absence de code', () => {
    expect(describeDatabaseError(new Error('mot de passe refusé'))).toBe(
      'mot de passe refusé',
    )
  })

  it('retombe sur le nom quand message et code manquent', () => {
    expect(describeDatabaseError(new AggregateError([], ''))).toBe(
      'AggregateError',
    )
  })

  it('accepte une valeur qui n’est pas une Error', () => {
    expect(describeDatabaseError('panne réseau')).toBe('panne réseau')
  })
})
