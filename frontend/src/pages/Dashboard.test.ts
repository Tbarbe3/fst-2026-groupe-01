import { describe, expect, it } from 'vitest'

import { translateAccountError } from './Dashboard'
import { describePasswordPolicy } from '../password-policy'

describe('translateAccountError', () => {
  it('traduit un mot de passe actuel incorrect', () => {
    expect(translateAccountError({ code: 'INVALID_PASSWORD' })).toBe(
        'Le mot de passe actuel est incorrect.',
    )
  })

  it('traduit un mot de passe trop court', () => {
    expect(translateAccountError({ code: 'PASSWORD_TOO_SHORT' })).toBe(
        'Le mot de passe doit contenir au moins 8 caractères.',
    )
  })

  it('traduit un mot de passe trop long', () => {
    expect(translateAccountError({ code: 'PASSWORD_TOO_LONG' })).toBe(
        'Le mot de passe est trop long.',
    )
  })

  it('reprend le message fourni de la politique de mot de passe', () => {
    expect(
        translateAccountError({
          code: 'WEAK_PASSWORD',
          message: 'Le mot de passe doit contenir au moins un symbole.',
        }),
    ).toBe('Le mot de passe doit contenir au moins un symbole.')
  })

  it('utilise la politique par défaut si aucun message n’est fourni pour WEAK_PASSWORD', () => {
    expect(translateAccountError({ code: 'WEAK_PASSWORD' })).toBe(
        describePasswordPolicy(),
    )
  })

  it('retombe sur un message générique pour un code inconnu', () => {
    expect(
        translateAccountError({ message: 'Database connection pool exhausted' }),
    ).toBe('Une erreur est survenue. Vérifiez les informations saisies.')
  })
})