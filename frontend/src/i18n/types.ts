export type Locale = 'fr' | 'en'

export interface DemoScenarioItem {
  id: string
  language: string
  languageLabel: string
  color: string
  title: string
  ticket: string
  persona: { name: string; tag: string }
  category: string
  severity: 'Critique' | 'Élevée' | 'Moyenne' | 'Critical' | 'High' | 'Medium'
  filename: string
  diff: Array<{
    oldLineNumber?: number
    newLineNumber?: number
    type: 'context' | 'add' | 'delete' | 'hunk'
    code: string
    isVulnerable?: boolean
  }>
  fixedDiff: Array<{
    oldLineNumber?: number
    newLineNumber?: number
    type: 'context' | 'add' | 'delete' | 'hunk'
    code: string
    isVulnerable?: boolean
  }>
  comment: {
    author: string
    role: string
    avatarInitial: string
    type: string
    text: string
    score: number
  }
}

export interface SupportedLanguageItem {
  name: string
  tag: string
  color: string
  flaws: string
  level: string
}
