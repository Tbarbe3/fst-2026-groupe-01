import { describe, expect, it } from 'vitest'

import { validatePassword } from '../password-policy.ts'

describe('validatePassword', () => {
  it('accepte un mot de passe conforme', () => {
    expect(validatePassword('Motdepasse1!')).toBeNull()
  })

  it('refuse un mot de passe trop court', () => {
    expect(validatePassword('Aa1!')).toContain('8 caractères')
  })

  it('liste les règles manquantes', () => {
    expect(validatePassword('motdepasse')).toBe(
      'Le mot de passe doit contenir au moins une majuscule, un chiffre et un symbole.',
    )
  })
})
