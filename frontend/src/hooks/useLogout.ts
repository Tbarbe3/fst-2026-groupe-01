import { useNavigate } from 'react-router'

import { authClient } from '../auth'

export function useLogout() {
  const navigate = useNavigate()
  return async () => {
    try {
      await authClient.signOut()
    } catch {
      // Hors ligne : on quitte quand même l'espace connecté.
    }
    await navigate('/', { replace: true })
  }
}
