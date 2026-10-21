import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { useI18n } from '@/i18n'
import { applyTheme, readStoredTheme, type Theme } from '../theme'

/** Affiche l'icône du thème vers lequel on bascule. */
export default function ThemeToggle() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<Theme>(readStoredTheme)
  const goingToLight = theme === 'dark'
  const label = goingToLight ? t('theme.switchToLight') : t('theme.switchToDark')

  const toggle = () => {
    const next: Theme = goingToLight ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <button type="button" className="btn-icon-nav" onClick={toggle} aria-label={label} title={label}>
      {goingToLight ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  )
}
