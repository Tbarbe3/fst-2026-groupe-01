import { Navigate, Outlet } from 'react-router'

import { authClient } from '../auth'

/** Écarte des pages de connexion un visiteur déjà authentifié. */
export default function GuestRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="auth-container" style={{ textAlign: 'center' }}>
        Chargement…
      </div>
    )
  }

  if (session?.user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
