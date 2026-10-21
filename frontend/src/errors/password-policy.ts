// Dupliqué dans backend/src/password-policy.ts : pas de workspace partagé
// entre les deux projets. Garder les deux synchronisées (cf. agent.md).
import { getCurrentLocale, type Locale } from '../i18n'

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

const RULES_FR: { test: (p: string) => boolean; label: string }[] = [
  { test: (p) => /[a-z]/.test(p), label: 'une minuscule' },
  { test: (p) => /[A-Z]/.test(p), label: 'une majuscule' },
  { test: (p) => /[0-9]/.test(p), label: 'un chiffre' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'un symbole' },
]

const RULES_EN: { test: (p: string) => boolean; label: string }[] = [
  { test: (p) => /[a-z]/.test(p), label: 'one lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'one uppercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'one digit' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'one symbol' },
]

export function describePasswordPolicy(locale: Locale = getCurrentLocale()): string {
  if (locale === 'en') {
    return `${MIN_PASSWORD_LENGTH} characters minimum, with at least one lowercase letter, one uppercase letter, one digit and one symbol.`
  }
  return `${MIN_PASSWORD_LENGTH} caractères minimum, avec au moins une minuscule, une majuscule, un chiffre et un symbole.`
}

/**
 * Message d'erreur localisé, ou `null` si conforme. Même règle que côté
 * serveur, qui fait foi : ce contrôle n'est qu'un confort, pas la sécurité.
 */
export function validatePassword(
  password: string,
  locale: Locale = getCurrentLocale(),
): string | null {
  if (locale === 'en') {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return `Password is too long (${MAX_PASSWORD_LENGTH} characters maximum).`
    }

    const missing = RULES_EN.filter((rule) => !rule.test(password)).map(
      (rule) => rule.label,
    )
    if (missing.length === 0) return null

    const last = missing.pop()
    const list = missing.length > 0 ? `${missing.join(', ')} and ${last}` : last
    return `Password must contain at least ${list}.`
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Le mot de passe est trop long (${MAX_PASSWORD_LENGTH} caractères maximum).`
  }

  const missing = RULES_FR.filter((rule) => !rule.test(password)).map(
    (rule) => rule.label,
  )
  if (missing.length === 0) return null

  const last = missing.pop()
  const list = missing.length > 0 ? `${missing.join(', ')} et ${last}` : last
  return `Le mot de passe doit contenir au moins ${list}.`
}
