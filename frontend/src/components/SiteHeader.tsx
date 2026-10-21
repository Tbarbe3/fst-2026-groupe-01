import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Code2, Home, LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react'

import { authClient } from '../auth'
import { useLogout } from '../hooks/useLogout'
import { handleSectionClick, useSectionHref } from '../hooks/useSectionHref'
import { useI18n } from '../i18n'
import AccountModal from './AccountModal'
import LanguageToggle from './LanguageToggle'
import ThemeToggle from './ThemeToggle'

const SECTIONS = [
  { hash: '#demo', key: 'header.navDemo' },
  { hash: '#languages', key: 'header.navLanguages' },
  { hash: '#workflow', key: 'header.navMethod' },
  { hash: '#progression', key: 'header.navProgress' },
] as const

export default function SiteHeader() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const { data: session } = authClient.useSession()
  const logout = useLogout()
  const sectionHref = useSectionHref()
  const [accountOpen, setAccountOpen] = useState(false)

  const user = session?.user
  const displayName = user?.name || user?.email || ''
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

  return (
    <>
      <header className="landing-header" role="banner">
        <div className="landing-header-inner">
          <Link
            to="/"
            className="landing-brand"
            aria-label={t('header.brandAria')}
            onClick={() => {
              if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <div className="brand-icon-wrapper">
              <Code2 size={22} className="brand-icon" />
            </div>
            <span className="brand-name">Code How?</span>
            <span className="brand-badge">{t('header.brandBadge')}</span>
          </Link>

          <nav className={`landing-nav${user ? '' : ' landing-nav-sections'}`} aria-label={t('header.navAria')}>
            {user ? (
              <>
                <NavLink to="/" end className={navClass}>
                  <Home size={16} aria-hidden="true" />
                  <span className="nav-link-text">{t('header.home')}</span>
                </NavLink>
                <NavLink to="/dashboard" className={navClass}>
                  <LayoutDashboard size={16} aria-hidden="true" />
                  <span className="nav-link-text">{t('header.dashboard')}</span>
                </NavLink>
              </>
            ) : (
              SECTIONS.map(({ hash, key }) => (
                <Link
                  key={hash}
                  to={sectionHref(hash)}
                  className="nav-link"
                  onClick={handleSectionClick(hash, pathname)}
                >
                  {t(key)}
                </Link>
              ))
            )}
          </nav>

          <div className="landing-actions">
            {user ? (
              <div className="user-nav-group">
                <button
                  type="button"
                  className="user-chip"
                  onClick={() => setAccountOpen(true)}
                  title={t('header.accountSettings')}
                  aria-label={t('header.accountSettingsFor', { name: displayName })}
                >
                  <div className="user-chip-avatar">
                    {user.image ? (
                      <img src={user.image} alt="" className="avatar-img" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="user-chip-name">{displayName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="btn-icon-nav btn-logout"
                  title={t('header.logout')}
                  aria-label={t('header.logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <>
                {/* Connecté, ces réglages vivent dans les paramètres du compte. */}
                <LanguageToggle />
                <ThemeToggle />
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
              </>
            )}
          </div>
        </div>
      </header>
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </>
  )
}
