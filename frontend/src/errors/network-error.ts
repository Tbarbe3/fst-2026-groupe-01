import { getCurrentLocale, type Locale } from '../i18n'

/**
 * Détecte un échec réseau (API injoignable) plutôt qu'une erreur applicative.
 * `fetch` rejette alors avec un `TypeError` dont le message vient du
 * navigateur, non traduit (« Failed to fetch », « NetworkError... »).
 */
export function describeNetworkError(
  error: unknown,
  locale: Locale = getCurrentLocale(),
): string | null {
  if (error instanceof TypeError) {
    return locale === 'en'
      ? "Unable to contact the server. Make sure it is running, then try again."
      : "Impossible de contacter le serveur. Vérifiez qu'il est démarré, puis réessayez."
  }
  return null
}
