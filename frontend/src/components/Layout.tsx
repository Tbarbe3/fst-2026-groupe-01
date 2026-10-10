import { Outlet } from 'react-router'

import { authClient } from '../auth'
import LoadingScreen from './LoadingScreen'

/**
 * Point unique où l'attente de session est traitée : aucune route n'est
 * montée avant résolution, donc les pages n'ont pas à gérer `isPending`.
 */
export default function Layout() {
  const { isPending } = authClient.useSession()

  return isPending ? <LoadingScreen /> : <Outlet />
}