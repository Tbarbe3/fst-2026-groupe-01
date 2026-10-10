// frontend/src/pages/dashboard-errors.ts
import { describePasswordPolicy } from './password-policy.ts'

export function translateAccountError(error: {
    code?: string
    message?: string
}): string {
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
            return error.message || describePasswordPolicy()
        default:
            return 'Une erreur est survenue. Vérifiez les informations saisies.'
    }
}