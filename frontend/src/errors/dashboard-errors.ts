import { getCurrentLocale, type Locale } from '../i18n'
import { describePasswordPolicy } from './password-policy.ts'

export function translateAccountError(
  error: {
    code?: string
    message?: string
  },
  locale: Locale = getCurrentLocale(),
): string {
  if (locale === 'en') {
    switch (error.code) {
      case 'INVALID_PASSWORD':
        return 'Current password is incorrect.'
      case 'INVALID_EMAIL':
        return 'Invalid email address.'
      case 'USER_ALREADY_EXISTS':
      case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
        return 'This email address is already in use by another account.'
      case 'PASSWORD_TOO_SHORT':
        return 'Password must contain at least 8 characters.'
      case 'PASSWORD_TOO_LONG':
        return 'Password is too long.'
      case 'WEAK_PASSWORD':
        return error.message || describePasswordPolicy('en')
      default:
        return 'An error occurred. Please verify your input.'
    }
  }

  switch (error.code) {
    case 'INVALID_PASSWORD':
      return 'Le mot de passe actuel est incorrect.'
    case 'INVALID_EMAIL':
      return "L'adresse e-mail n'est pas valide."
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Cette adresse e-mail est déjà utilisée par un autre compte.'
    case 'PASSWORD_TOO_SHORT':
      return 'Le mot de passe doit contenir au moins 8 caractères.'
    case 'PASSWORD_TOO_LONG':
      return 'Le mot de passe est trop long.'
    case 'WEAK_PASSWORD':
      return error.message || describePasswordPolicy('fr')
    default:
      return 'Une erreur est survenue. Vérifiez les informations saisies.'
  }
}