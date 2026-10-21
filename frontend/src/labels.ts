import { en, fr, getCurrentLocale, translate, type Locale } from './i18n'

export const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  java: 'Java',
  php: 'PHP',
  rust: 'Rust',
  csharp: 'C#',
}

const dictionaryLabels = (locale: Locale) => (locale === 'en' ? en : fr).labels

export function getDifficultyLabels(locale: Locale = getCurrentLocale()): Record<string, string> {
  return dictionaryLabels(locale).difficulty
}

export function getCategoryLabels(locale: Locale = getCurrentLocale()): Record<string, string> {
  return dictionaryLabels(locale).category
}

export function getSeverityLabels(locale: Locale = getCurrentLocale()): Record<string, string> {
  return dictionaryLabels(locale).severity
}

export const label = (labels: Record<string, string>, key: string | null, locale?: Locale) =>
  key === null ? translate(locale ?? getCurrentLocale(), 'common.hidden') : (labels[key] ?? key)
