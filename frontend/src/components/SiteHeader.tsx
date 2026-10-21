import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Code2, LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react'

import { authClient } from '../auth'
import { handleSectionClick, useSectionHref } from '../hooks/useSectionHref'
import { useI18n } from '../i18n'
import AccountModal from './AccountModal'
import LanguageToggle from './LanguageToggle'

export default function SiteHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useI18n()
  const { data: session } = authClient.useSession()
  const isAuthenticated = Boolean(session?.user)
  const displayName = session?.user?.name || session?.user?.email || 'Développeur'

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } catch {
      // Ignoré si échec réseau
    }
    await navigate('/', { replace: true })
  }
  const userInitial = displayName.charAt(0).toUpperCase()
  const sectionHref = useSectionHref()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <>
      <header className="landing-header" role="banner">
        <div className="landing-header-inner">
          <Link
            to="/"
            className="landing-brand"
            aria-label={t('header.brandAria')}
            onClick={() => {
              if (typeof window !== 'undefined' && pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
          >
            <div className="brand-icon-wrapper">
              <Code2 size={22} className="brand-icon" />
            </div>
            <span className="brand-name">Code How?</span>
            <span className="brand-badge">{t('header.brandBadge')}</span>
          </Link>

          <nav className="landing-nav" aria-label={t('header.navAria')}>
            <Link
              to={sectionHref('#demo')}
              className="nav-link"
              onClick={handleSectionClick('#demo', pathname)}
            >
              {t('header.navDemo')}
            </Link>
            <Link
              to={sectionHref('#languages')}
              className="nav-link"
              onClick={handleSectionClick('#languages', pathname)}
            >
              {t('header.navLanguages')}
            </Link>
            <Link
              to={sectionHref('#workflow')}
              className="nav-link"
              onClick={handleSectionClick('#workflow', pathname)}
            >
              {t('header.navMethod')}
            </Link>
            <Link
              to={sectionHref('#progression')}
              className="nav-link"
              onClick={handleSectionClick('#progression', pathname)}
            >
              {t('header.navProgress')}
            </Link>
          </nav>

          <div className="landing-actions">
            <LanguageToggle />

            {/* Bouton d'accès au dashboard toujours accessible */}
            <Link
              to="/dashboard"
              className="btn-dashboard-nav"
              title={t('header.dashboardTitle')}
            >
              <LayoutDashboard size={16} />
              <span>{t('header.dashboard')}</span>
            </Link>

            {isAuthenticated ? (
              <div className="user-nav-group">
                <button
                  type="button"
                  className="user-chip"
                  onClick={() => setAccountOpen(true)}
                  title={t('header.accountSettings')}
                  aria-label={t('header.accountSettingsFor', { name: displayName })}
                >
                  <div className="user-chip-avatar">
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="Avatar"
                        className="avatar-img"
                      />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <span className="user-chip-name">{displayName}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-icon-nav"
                  title={t('header.logout')}
                  aria-label={t('header.logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="auth-nav-group">
                <Link to="/login" className="btn-nav-login">
                  <LogIn size={15} />
                  <span>{t('header.login')}</span>
                </Link>
                <Link to="/register" className="btn-nav-register">
                  <UserPlus size={15} />
                  <span>{t('header.register')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </>
  )
}
