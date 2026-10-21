import { getCurrentLocale, type Locale } from './i18n'

export const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  java: 'Java',
  php: 'PHP',
  rust: 'Rust',
  csharp: 'C#',
}

export const DIFFICULTY_LABELS_FR: Record<string, string> = {
  junior: 'Junior',
  intermediate: 'Intermédiaire',
  senior: 'Senior',
}

export const DIFFICULTY_LABELS_EN: Record<string, string> = {
  junior: 'Junior',
  intermediate: 'Intermediate',
  senior: 'Senior',
}

export const DIFFICULTY_LABELS = DIFFICULTY_LABELS_FR

export const CATEGORY_LABELS_FR: Record<string, string> = {
  security_owasp: 'Sécurité (OWASP)',
  performance: 'Performance',
  architecture: 'Robustesse / Architecture',
  race_condition: 'Concurrence',
  business_logic: 'Logique métier',
}

export const CATEGORY_LABELS_EN: Record<string, string> = {
  security_owasp: 'Security (OWASP)',
  performance: 'Performance',
  architecture: 'Robustness / Architecture',
  race_condition: 'Concurrency',
  business_logic: 'Business Logic',
}

export const CATEGORY_LABELS = CATEGORY_LABELS_FR

export const SEVERITY_LABELS_FR: Record<string, string> = {
  critical: 'Critique',
  major: 'Majeure',
  minor: 'Mineure',
}

export const SEVERITY_LABELS_EN: Record<string, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
}

export const SEVERITY_LABELS = SEVERITY_LABELS_FR

export function getDifficultyLabels(locale: Locale = getCurrentLocale()): Record<string, string> {
  return locale === 'en' ? DIFFICULTY_LABELS_EN : DIFFICULTY_LABELS_FR
}

export function getCategoryLabels(locale: Locale = getCurrentLocale()): Record<string, string> {
  return locale === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS_FR
}

export function getSeverityLabels(locale: Locale = getCurrentLocale()): Record<string, string> {
  return locale === 'en' ? SEVERITY_LABELS_EN : SEVERITY_LABELS_FR
}

export function getLanguageLabels(): Record<string, string> {
  return LANGUAGE_LABELS
}

export const label = (
  labels: Record<string, string>,
  key: string | null,
  locale?: Locale,
) => {
  if (key === null) {
    const loc = locale ?? getCurrentLocale()
    return loc === 'en' ? 'Hidden' : 'Masqué'
  }
  return labels[key] ?? key
}
