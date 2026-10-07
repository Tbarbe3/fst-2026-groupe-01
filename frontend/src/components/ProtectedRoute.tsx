import { Navigate, Outlet, useLocation } from 'react-router'

import { authClient } from '../auth'

export default function ProtectedRoute() {
  const location = useLocation()
  const { data: session } = authClient.useSession()

  if (!session) {
    // `state` conserve la destination voulue, pour y revenir après connexion.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Une session reconnue mais sans utilisateur signale une réponse de
  // /api/auth/get-session non conforme. Sans ce cas, chaque page protégée
  // lèverait sur `session.user`, laissant un écran blanc sans échappatoire.
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
            onClick={() => void authClient.signOut()}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
