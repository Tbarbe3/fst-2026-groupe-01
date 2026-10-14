export const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  java: 'Java',
  php: 'PHP',
  rust: 'Rust',
  csharp: 'C#',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  junior: 'Junior',
  intermediate: 'Intermédiaire',
  senior: 'Senior',
}

export const CATEGORY_LABELS: Record<string, string> = {
  security_owasp: 'Sécurité (OWASP)',
  performance: 'Performance',
  architecture: 'Robustesse / Architecture',
  race_condition: 'Concurrence',
  business_logic: 'Logique métier',
}

export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  major: 'Majeure',
  minor: 'Mineure',
}

export const label = (labels: Record<string, string>, key: string | null) =>
  key === null ? 'Masqué' : (labels[key] ?? key)
