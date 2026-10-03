import { useState } from 'react'
import { authClient } from './auth'

function App() {
  const { data: session, isPending } = authClient.useSession()
  const [isLogin, setIsLogin] = useState(true)
  const [id, setId] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (passcode.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (!id.trim()) {
      setError('L\'identifiant est requis.')
      return
    }

    setIsLoading(true)
    const email = `${id.trim()}@codehow.local`

    try {
      if (isLogin) {
        // Vérification préalable de l'existence de l'utilisateur
        const res = await fetch('/api/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id.trim() }),
        })
        const data = await res.json()
        
        if (!data.exists) {
          setError("Aucun compte n'existe avec cet identifiant.")
          setIsLoading(false)
          return
        }

        const { error } = await authClient.signIn.email({
          email,
          password: passcode,
        })
        if (error) {
          setError(error.message || 'Le mot de passe est incorrect.')
        }
      } else {
        const { error } = await authClient.signUp.email({
          name: id.trim(),
          email,
          password: passcode,
        })
        if (error) {
          setError(error.message || 'Erreur lors de l\'inscription.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await authClient.signOut()
  }

  if (isPending) {
    return <div className="auth-container" style={{ textAlign: 'center' }}>Chargement...</div>
  }

  if (session) {
    return (
      <div className="auth-container">
        <div className="auth-card dashboard">
          <h2>Bienvenue, {session.user.name} !</h2>
          <p>Vous êtes connecté avec succès à l'application Code How.</p>
          <button className="btn btn-logout" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Code How?</h1>
          <p>{isLogin ? 'Connectez-vous à votre compte' : 'Créez un nouveau compte'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="id">Identifiant</label>
            <input
              type="text"
              id="id"
              className="form-control"
              placeholder="Ex: thomas"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passcode">Mot de passe</label>
            <input
              type="password"
              id="passcode"
              className="form-control"
              placeholder="••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={isLoading}
              minLength={8}
            />
          </div>

          {error && (
            <div className="error-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Patientez...' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
          </button>
        </form>

        <div className="toggle-mode">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
