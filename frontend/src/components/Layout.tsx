import { Outlet } from 'react-router'

import { authClient } from '../auth'
import LoadingScreen from './LoadingScreen'

/**
 * Point unique où l'attente de session est traitée : aucune route n'est
 * montée avant résolution, donc les pages n'ont pas à gérer `isPending`.
 */
export default function Layout() {
  const { isPending } = authClient.useSession()

  const handleForceLogout = async () => {
    try {
      await authClient.signOut()
    } catch {
      // Ignore les erreurs réseau si le backend rejette la requête
    }

    // Purgage du cookie de session pour couper la boucle
    document.cookie = 'better-auth.session_token=; Max-Age=0; path=/;'

    // Redirection brute pour réinitialiser complètement l'état de l'application
    window.location.href = '/login'
  }

  return (
    <>

      {isPending ? <LoadingScreen /> : <Outlet />}
    </>
  )
}
