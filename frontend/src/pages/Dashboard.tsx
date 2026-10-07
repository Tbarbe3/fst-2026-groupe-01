import { useNavigate } from 'react-router'

import { authClient } from '../auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  const handleLogout = async () => {
    await authClient.signOut()
    await navigate('/login', { replace: true })
  }

  const displayName = session?.user.name || session?.user.email

  return (
    <div className="auth-container">
      <div className="auth-card dashboard">
        <h2>Bienvenue, {displayName} !</h2>
        <p>Vous êtes connecté avec succès à l'application Code How.</p>
        <button className="btn btn-logout" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
