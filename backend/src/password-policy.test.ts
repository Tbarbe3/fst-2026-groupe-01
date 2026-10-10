import { describe, expect, it } from 'vitest'

import { validatePasswordPolicy } from './password-policy.js'

describe('validatePasswordPolicy', () => {
  it('accepte un mot de passe qui respecte toutes les règles', () => {
    expect(validatePasswordPolicy('Motdepasse1!')).toBeNull()
  })

  it('refuse un mot de passe trop court', () => {
    expect(validatePasswordPolicy('Aa1!')).toContain('8 caractères')
  })

  it('refuse un mot de passe trop long', () => {
    expect(validatePasswordPolicy(`Aa1!${'a'.repeat(130)}`)).toContain(
      'trop long',
    )
  })

  it('liste les règles manquantes', () => {
    // Que des minuscules : il manque majuscule, chiffre et symbole.
    expect(validatePasswordPolicy('motdepasse')).toBe(
      'Le mot de passe doit contenir au moins une majuscule, un chiffre et un symbole.',
    )
  })

  it("n'oublie aucune règle prise individuellement", () => {
    expect(validatePasswordPolicy('motdepasse1!')).toContain('majuscule')
    expect(validatePasswordPolicy('MOTDEPASSE1!')).toContain('minuscule')
    expect(validatePasswordPolicy('Motdepasse!')).toContain('chiffre')
    expect(validatePasswordPolicy('Motdepasse1')).toContain('symbole')
  })
})
