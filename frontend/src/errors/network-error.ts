import { getCurrentLocale, translate, type Locale } from '@/i18n'

/**
 * Détecte un échec réseau (API injoignable) plutôt qu'une erreur applicative :
 * `fetch` rejette alors avec un `TypeError` au message non traduit.
 */
export function describeNetworkError(
  error: unknown,
  locale: Locale = getCurrentLocale(),
): string | null {
  return error instanceof TypeError ? translate(locale, 'common.networkError') : null
}

/** Message d'une erreur d'API : réseau, sinon message du serveur, sinon repli. */
export function describeError(error: unknown, fallback: string, locale: Locale = getCurrentLocale()): string {
  return describeNetworkError(error, locale) ?? (error instanceof Error ? error.message : fallback)
}
