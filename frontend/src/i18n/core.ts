import { createContext, useContext } from 'react'

import { en } from './en'
import { fr, type Translations } from './fr'
import type { Locale } from './types'

export const STORAGE_KEY = 'codehow-locale'
export const DEFAULT_LOCALE: Locale = 'fr'

const dictionaries: Record<Locale, Translations> = { fr, en }

let currentActiveLocale: Locale = DEFAULT_LOCALE

export function getCurrentLocale(): Locale {
  return currentActiveLocale
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'fr' || stored === 'en' ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function applyLocaleToDocument(locale: Locale): void {
  currentActiveLocale = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Échec silencieux si navigation privée
  }
}

export function resolveNestedKey(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match
  })
}

export function translate(
  locale: Locale,
  path: string,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
  const template =
    resolveNestedKey(dict, path) ??
    resolveNestedKey(dictionaries[DEFAULT_LOCALE], path) ??
    path
  return interpolate(template, params)
}

// Construction récursive des clés typées (ex: 'auth.emailLabel')
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

export type Leaves<T> = T extends object
  ? { [K in keyof T]-?: Join<K, Leaves<T[K]>> }[keyof T]
  : ''

export type TranslationKey = Leaves<Translations>

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string
  formatDate: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
  isFrench: boolean
  isEnglish: boolean
}

export const defaultContextValue: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key: string, params?: Record<string, string | number>) =>
    translate(DEFAULT_LOCALE, key, params),
  formatDate: (date, options) =>
    new Date(date).toLocaleDateString('fr-FR', options),
  isFrench: true,
  isEnglish: false,
}

export const I18nContext = createContext<I18nContextValue>(defaultContextValue)

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}
