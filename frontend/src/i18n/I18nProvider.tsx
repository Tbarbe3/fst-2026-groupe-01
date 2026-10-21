import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  applyLocaleToDocument,
  I18nContext,
  readStoredLocale,
  translate,
  type I18nContextValue,
  type TranslationKey,
} from './core'
import type { Locale } from './types'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((nextLocale: Locale) => {
    applyLocaleToDocument(nextLocale)
    setLocaleState(nextLocale)
  }, [])

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === 'fr' ? 'en' : 'fr'
    setLocale(next)
  }, [locale, setLocale])

  useEffect(() => {
    applyLocaleToDocument(locale)
  }, [locale])

  const t = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>) => {
      return translate(locale, key, params)
    },
    [locale],
  )

  const formatDate = useCallback(
    (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      const localeTag = locale === 'fr' ? 'fr-FR' : 'en-US'
      return new Date(date).toLocaleDateString(localeTag, options)
    },
    [locale],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      formatDate,
      isFrench: locale === 'fr',
      isEnglish: locale === 'en',
    }),
    [locale, setLocale, toggleLocale, t, formatDate],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
