import { describe, expect, it } from 'vitest'

import { translateAuthError } from '../auth-errors'
import { describePasswordPolicy } from '../password-policy'

describe('translateAuthError', () => {
  it.each([
    ['INVALID_PASSWORD', 'Le mot de passe actuel est incorrect.'],
    ['USER_ALREADY_EXISTS', 'Un compte existe déjà avec cette adresse e-mail.'],
    ['PASSWORD_TOO_SHORT', 'Le mot de passe doit contenir au moins 8 caractères.'],
    ['PASSWORD_TOO_LONG', 'Le mot de passe est trop long (128 caractères maximum).'],
  ])('traduit %s', (code, expected) => {
    expect(translateAuthError({ code }, 'errors.generic', 'fr')).toBe(expected)
  })

  it('traduit aussi en anglais', () => {
    expect(translateAuthError({ code: 'INVALID_EMAIL' }, 'errors.generic', 'en')).toBe('Invalid email address.')
  })

  it('reprend le message du serveur pour WEAK_PASSWORD en français', () => {
    const message = 'Le mot de passe doit contenir au moins un symbole.'
    expect(translateAuthError({ code: 'WEAK_PASSWORD', message }, 'errors.generic', 'fr')).toBe(message)
  })

  it('remplace le message français du serveur par la règle localisée en anglais', () => {
    expect(
      translateAuthError({ code: 'WEAK_PASSWORD', message: 'Le mot de passe…' }, 'errors.generic', 'en'),
    ).toBe(describePasswordPolicy('en'))
  })

  it('retombe sur le message de repli demandé pour un code inconnu', () => {
    expect(translateAuthError({ message: 'pool exhausted' }, 'errors.generic', 'fr')).toBe(
      'Une erreur est survenue. Vérifiez les informations saisies.',
    )
    expect(translateAuthError({}, 'errors.signUpFailed', 'en')).toBe(
      'Registration failed. Please check the information entered.',
    )
  })
})
