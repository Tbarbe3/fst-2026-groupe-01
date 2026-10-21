import { Link } from 'react-router'

import { useI18n } from '../i18n'

export default function NotFound() {
  const { t } = useI18n()

  return (
    <div className="auth-container">
      <div className="auth-card dashboard">
        <h2>{t('notFound.title')}</h2>
        <p>{t('notFound.desc')}</p>
        <Link to="/">{t('notFound.returnHome')}</Link>
      </div>
    </div>
  )
}
