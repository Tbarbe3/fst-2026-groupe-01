import { Link, useNavigate } from 'react-router'
import { Code2 } from 'lucide-react'

import { authClient } from '../auth'
import { useSectionHref } from '../hooks/useSectionHref'

export default function SiteFooter() {
  const navigate = useNavigate()
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
          <p className="footer-brand-desc">
            La plateforme d'entraînement à la relecture critique de code, à la sécurité
            applicative (OWASP) et aux bonnes pratiques de Pull Request.
          </p>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">Plateforme</div>
          <ul className="footer-links-list">
            <li>
              <a href={sectionHref('#demo')}>Démo de Code</a>
            </li>
            <li>
              <a href={sectionHref('#languages')}>Langages supportés</a>
            </li>
            <li>
              <a href={sectionHref('#workflow')}>Méthode & Workflow</a>
            </li>
            <li>
              <Link to="/dashboard">Tableau de bord</Link>
            </li>
          </ul>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">Compte & Accès</div>
          <ul className="footer-links-list">
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/dashboard">Mon profil</Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="footer-btn-link"
                  >
                    Se déconnecter
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">Se connecter</Link>
                </li>
                <li>
                  <Link to="/register">S'inscrire</Link>
                </li>
                <li>
                  <Link to="/dashboard">Dashboard (connexion requise)</Link>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="footer-links-col">
          <div className="footer-links-title">Qualité & Normes</div>
          <p className="footer-note">
            Interface accessible conforme WCAG AA avec contrastes vérifiés et navigation clavier complète.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Code How? • Projet Technologies Web — Tous droits réservés.</p>
      </div>
    </footer>
  )
}
