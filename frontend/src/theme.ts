export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'codehow-theme'

export const DEFAULT_THEME: Theme = 'dark'

export function readStoredTheme(): Theme {
  // localStorage peut lever en navigation privée ou si les cookies tiers
  // sont bloqués : un thème est un détail, il ne doit pas casser la page.
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Préférence non persistée, sans conséquence pour la session en cours.
  }
}
