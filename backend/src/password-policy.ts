// Dupliqué dans frontend/src/password-policy.ts : pas de workspace partagé
// entre les deux projets. Garder les deux synchronisées (cf. agent.md).
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

const RULES: { test: (p: string) => boolean; label: string }[] = [
  { test: (p) => /[a-z]/.test(p), label: 'une minuscule' },
  { test: (p) => /[A-Z]/.test(p), label: 'une majuscule' },
  { test: (p) => /[0-9]/.test(p), label: 'un chiffre' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'un symbole' },
]

export function describePasswordPolicy(): string {
  return `${MIN_PASSWORD_LENGTH} caractères minimum, avec au moins une minuscule, une majuscule, un chiffre et un symbole.`
}

/**
 * Message d'erreur en français, ou `null` si conforme. Appliquée à
 * l'inscription et au changement de mot de passe, jamais à la connexion :
 * un mot de passe créé sous une politique antérieure doit encore marcher.
 */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Le mot de passe est trop long (${MAX_PASSWORD_LENGTH} caractères maximum).`
  }

  const missing = RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.label,
  )
  if (missing.length === 0) return null

  const last = missing.pop()
  const list = missing.length > 0 ? `${missing.join(', ')} et ${last}` : last
  return `Le mot de passe doit contenir au moins ${list}.`
}
