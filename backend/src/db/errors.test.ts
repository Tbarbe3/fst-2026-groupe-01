import { describe, expect, it } from 'vitest'

import { describeDatabaseError, describeDatabaseTarget } from './errors.js'

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

describe('describeDatabaseTarget', () => {
  it('ne révèle ni utilisateur ni mot de passe', () => {
    const target = describeDatabaseTarget(
      'postgresql://codehow:secret@127.0.0.1:5432/codehow',
    )
    expect(target).toBe('127.0.0.1:5432/codehow')
    expect(target).not.toContain('secret')
    expect(target).not.toContain('codehow:')
  })

  it('retombe sur le port par défaut si absent', () => {
    expect(describeDatabaseTarget('postgresql://x@exemple.fr/db')).toBe(
      'exemple.fr:5432/db',
    )
  })

  it("ne lève pas sur une URL mal formée", () => {
    expect(describeDatabaseTarget('pas-une-url')).toBe(
      'URL de connexion invalide',
    )
  })
})
