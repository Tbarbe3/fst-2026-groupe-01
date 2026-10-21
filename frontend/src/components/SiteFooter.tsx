import { Link, useLocation } from 'react-router'
import { Code2 } from 'lucide-react'

import { authClient } from '../auth'
import { useLogout } from '../hooks/useLogout'
import { handleSectionClick, useSectionHref } from '../hooks/useSectionHref'
import { useI18n } from '@/i18n'

const SECTIONS = [
  { hash: '#demo', key: 'footer.codeDemo' },
  { hash: '#languages', key: 'footer.supportedLanguages' },
  { hash: '#workflow', key: 'footer.methodWorkflow' },
] as const

export default function SiteFooter() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const { data: session } = authClient.useSession()
  const logout = useLogout()
  const sectionHref = useSectionHref()

  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-footer-inner">
        <div className="footer-brand-col">
          <div className="landing-brand">
            <div className="brand-icon-wrapper">
              <Code2 size={20} className="brand-icon" />
            </div>
            <span className="brand-name">Code How?</span>
          </div>
          <p className="footer-brand-desc">{t('footer.brandDesc')}</p>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">{t('footer.platform')}</div>
          <ul className="footer-links-list">
            {SECTIONS.map(({ hash, key }) => (
              <li key={hash}>
                <Link to={sectionHref(hash)} onClick={handleSectionClick(hash, pathname)}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">{t('footer.accountAccess')}</div>
          <ul className="footer-links-list">
            {session?.user ? (
              <>
                <li>
                  <Link to="/dashboard">{t('footer.dashboard')}</Link>
                </li>
                <li>
                  <button type="button" onClick={() => void logout()} className="footer-btn-link">
                    {t('footer.logout')}
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">{t('footer.login')}</Link>
                </li>
                <li>
                  <Link to="/register">{t('footer.register')}</Link>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">{t('footer.qualityNorms')}</div>
          <p className="footer-note">{t('footer.wcagNote')}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  )
}
