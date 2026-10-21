import { getCurrentLocale, translate, type Locale } from '@/i18n'
import { describePasswordPolicy, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password-policy'

/**
 * Traduit une erreur Better Auth par son `code`, stable, plutôt que par son
 * message anglais. « Adresse déjà utilisée » divulgue l'existence d'un compte :
 * compromis assumé faute de réinitialisation de mot de passe (BACKLOG.md, entrée 12).
 */
export function translateAuthError(
  error: { code?: string; message?: string },
  fallbackKey: 'errors.generic' | 'errors.signUpFailed' = 'errors.generic',
  locale: Locale = getCurrentLocale(),
): string {
  switch (error.code) {
    case 'INVALID_PASSWORD':
      return translate(locale, 'errors.invalidPassword')
    case 'INVALID_EMAIL':
      return translate(locale, 'errors.invalidEmail')
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return translate(locale, 'errors.emailTaken')
    case 'PASSWORD_TOO_SHORT':
      return translate(locale, 'errors.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
    case 'PASSWORD_TOO_LONG':
      return translate(locale, 'errors.passwordTooLong', { max: MAX_PASSWORD_LENGTH })
    case 'WEAK_PASSWORD':
      // Message du serveur, rédigé en français : repli sur la règle localisée en anglais.
      return locale === 'fr' && error.message ? error.message : describePasswordPolicy(locale)
    default:
      return translate(locale, fallbackKey)
  }
}
