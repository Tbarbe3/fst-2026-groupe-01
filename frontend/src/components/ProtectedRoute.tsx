import { Navigate, Outlet, useLocation } from 'react-router'

import { authClient } from '../auth'

export default function ProtectedRoute() {
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
            <h2>Session invalide</h2>
            <p>
              Votre session est reconnue mais incomplète. Déconnectez-vous puis
              reconnectez-vous.
            </p>
            <button
                className="btn btn-logout"
                onClick={handleForceLogout}
            >
              Se déconnecter
            </button>
          </div>
        </div>
    )
  }

  return <Outlet />
}