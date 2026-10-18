import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Code2, LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react'

import { authClient } from '../auth'
import { useSectionHref } from '../hooks/useSectionHref'
import AccountModal from './AccountModal'

export default function SiteHeader() {
  const navigate = useNavigate()
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
        <Link to="/" className="landing-brand" aria-label="Accueil Code How?">
          <div className="brand-icon-wrapper">
            <Code2 size={22} className="brand-icon" />
          </div>
          <span className="brand-name">Code How?</span>
          <span className="brand-badge">IA Review</span>
        </Link>

        <nav className="landing-nav" aria-label="Navigation principale">
          <a href={sectionHref('#demo')} className="nav-link">
            Démo de Code
          </a>
          <a href={sectionHref('#languages')} className="nav-link">
            Langages
          </a>
          <a href={sectionHref('#workflow')} className="nav-link">
            Méthode
          </a>
          <a href={sectionHref('#progression')} className="nav-link">
            Progression
          </a>
        </nav>

        <div className="landing-actions">
          {/* Bouton d'accès au dashboard toujours accessible */}
          <Link
            to="/dashboard"
            className="btn-dashboard-nav"
            title="Accéder au tableau de bord"
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>

          {isAuthenticated ? (
            <div className="user-nav-group">
              <button
                type="button"
                className="user-chip"
                onClick={() => setAccountOpen(true)}
                title="Paramètres du compte"
                aria-label={`Paramètres du compte de ${displayName}`}
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
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="auth-nav-group">
              <Link to="/login" className="btn-nav-login">
                <LogIn size={15} />
                <span>Se connecter</span>
              </Link>
              <Link to="/register" className="btn-nav-register">
                <UserPlus size={15} />
                <span>S’inscrire</span>
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
