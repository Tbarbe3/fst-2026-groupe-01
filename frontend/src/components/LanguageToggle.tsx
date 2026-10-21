import { useI18n } from '@/i18n'

// SVG plutôt qu'emoji : Windows n'affiche pas les emojis drapeaux.
function FrenchFlag() {
  return (
    <svg viewBox="0 0 3 2" width="24" height="16" aria-hidden="true">
      <rect width="1" height="2" fill="#002654" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ce1126" />
    </svg>
  )
}

function BritishFlag() {
  return (
    <svg viewBox="0 0 60 30" width="24" height="16" aria-hidden="true" preserveAspectRatio="none">
      <clipPath id="uk-flag-clip">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-flag-clip)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}

/** Affiche le drapeau de la langue vers laquelle on bascule. */
export default function LanguageToggle() {
  const { locale, toggleLocale, t } = useI18n()

  return (
    <button
      type="button"
      className="btn-icon-nav btn-flag"
      onClick={toggleLocale}
      aria-label={t('header.switchLangAria')}
      title={t('header.switchLangTitle')}
    >
      {locale === 'fr' ? <BritishFlag /> : <FrenchFlag />}
    </button>
  )
}
