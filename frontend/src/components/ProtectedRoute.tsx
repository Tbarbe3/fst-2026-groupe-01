import { Navigate, Outlet, useLocation } from 'react-router'

import { authClient } from '../auth'
import { useI18n } from '../i18n'

export default function ProtectedRoute() {
  const { t } = useI18n()
  const location = useLocation()
  const { data: session } = authClient.useSession()

  const handleForceLogout = async () => {
    try {
      await authClient.signOut()
    } catch {
      // Ignore si le backend rejette la requête
    }

    // Supprime le cookie de session Better Auth pour éviter la boucle
    document.cookie = 'better-auth.session_token=; Max-Age=0; path=/;'
    document.cookie = '__Secure-better-auth.session_token=; Max-Age=0; path=/;'

    // Redirection directe pour purger l'état mémoire
    window.location.href = '/login'
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!session.user) {
    return (
      <div className="auth-container">
        <div className="auth-card dashboard">
          <h2>{t('protected.invalidSession')}</h2>
          <p>{t('protected.incompleteDesc')}</p>
          <button className="btn btn-logout" onClick={handleForceLogout}>
            {t('protected.logout')}
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}