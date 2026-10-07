import { Outlet } from 'react-router'

import { authClient } from '../auth'
import LoadingScreen from './LoadingScreen'
import ThemeToggle from './ThemeToggle'

/**
 * Point unique où l'attente de la session est traitée. Tant qu'elle n'est
 * pas résolue, aucune route n'est montée : les gardes et les pages peuvent
 * donc considérer la session comme connue et n'ont pas à gérer `isPending`.
 */
export default function Layout() {
  const { isPending } = authClient.useSession()

  return (
    <>
      <ThemeToggle />
      {isPending ? <LoadingScreen /> : <Outlet />}
    </>
  )
}
