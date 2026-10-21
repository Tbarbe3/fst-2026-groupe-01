// Dupliqué dans backend/src/password-policy.ts : pas de workspace partagé
// entre les deux projets. Garder les deux synchronisées (cf. agent.md).
import { getCurrentLocale, translate, type Locale } from '@/i18n'

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

const RULES: { test: (p: string) => boolean; key: string }[] = [
  { test: (p) => /[a-z]/.test(p), key: 'errors.ruleLower' },
  { test: (p) => /[A-Z]/.test(p), key: 'errors.ruleUpper' },
  { test: (p) => /[0-9]/.test(p), key: 'errors.ruleDigit' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), key: 'errors.ruleSymbol' },
]

export function describePasswordPolicy(locale: Locale = getCurrentLocale()): string {
  return translate(locale, 'errors.passwordPolicy', { min: MIN_PASSWORD_LENGTH })
}

/**
 * Message d'erreur localisé, ou `null` si conforme. Le serveur applique la
 * même règle et fait foi : ce contrôle n'est qu'un confort.
 */
export function validatePassword(
  password: string,
  locale: Locale = getCurrentLocale(),
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return translate(locale, 'errors.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return translate(locale, 'errors.passwordTooLong', { max: MAX_PASSWORD_LENGTH })
  }

  const missing = RULES.filter((rule) => !rule.test(password)).map((rule) => translate(locale, rule.key))
  if (missing.length === 0) return null

  const last = missing.pop()
  const list = missing.length > 0 ? `${missing.join(', ')} ${translate(locale, 'errors.listAnd')} ${last}` : last
  return translate(locale, 'errors.passwordMissing', { list: list! })
}
