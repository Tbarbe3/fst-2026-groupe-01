import { Link, useLocation, useNavigate } from 'react-router'
import { Code2 } from 'lucide-react'

import { authClient } from '../auth'
import { handleSectionClick, useSectionHref } from '../hooks/useSectionHref'
import { useI18n } from '../i18n'

export default function SiteFooter() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useI18n()
  const { data: session } = authClient.useSession()
  const isAuthenticated = Boolean(session?.user)

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } catch {
      // Ignoré si échec réseau
    }
    await navigate('/', { replace: true })
  }
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
            <li>
              <Link
                to={sectionHref('#demo')}
                onClick={handleSectionClick('#demo', pathname)}
              >
                {t('footer.codeDemo')}
              </Link>
            </li>
            <li>
              <Link
                to={sectionHref('#languages')}
                onClick={handleSectionClick('#languages', pathname)}
              >
                {t('footer.supportedLanguages')}
              </Link>
            </li>
            <li>
              <Link
                to={sectionHref('#workflow')}
                onClick={handleSectionClick('#workflow', pathname)}
              >
                {t('footer.methodWorkflow')}
              </Link>
            </li>
            <li>
              <Link to="/dashboard">{t('footer.dashboard')}</Link>
            </li>
          </ul>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">{t('footer.accountAccess')}</div>
          <ul className="footer-links-list">
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/dashboard">{t('footer.myProfile')}</Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="footer-btn-link"
                  >
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
                <li>
                  <Link to="/dashboard">{t('footer.dashboardReq')}</Link>
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
