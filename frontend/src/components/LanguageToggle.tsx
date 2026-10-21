import { Languages } from 'lucide-react'

import { useI18n } from '../i18n'

interface LanguageToggleProps {
  className?: string
}

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { locale, toggleLocale, t } = useI18n()
  const isFr = locale === 'fr'

  return (
    <button
      type="button"
      className={`btn-lang-toggle ${className}`.trim()}
      onClick={toggleLocale}
      aria-label={t('header.switchLangAria')}
      title={t('header.switchLangTitle')}
    >
      <Languages size={15} className="lang-icon" aria-hidden="true" />
      <span className="lang-badge-group">
        <span className={`lang-chip ${isFr ? 'is-active' : ''}`}>FR</span>
        <span className="lang-sep" aria-hidden="true">/</span>
        <span className={`lang-chip ${!isFr ? 'is-active' : ''}`}>EN</span>
      </span>
    </button>
  )
}
