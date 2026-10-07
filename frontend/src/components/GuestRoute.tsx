import { Navigate, Outlet } from 'react-router'

import { authClient } from '../auth'

/** Écarte des pages de connexion un visiteur déjà authentifié. */
export default function GuestRoute() {
  const { data: session } = authClient.useSession()

  if (session?.user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
