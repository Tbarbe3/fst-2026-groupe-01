import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { authClient } from '../auth'

interface AuthPageProps {
  mode: 'login' | 'register'
}

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const isLogin = mode === 'login'

  const [id, setId] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!id.trim()) {
      setError("L'identifiant est requis.")
      return
    }

    if (passcode.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setIsLoading(true)

    // Better Auth exige une adresse e-mail ; l'application n'en demande pas,
    // on en dérive donc une depuis l'identifiant sur un domaine réservé.
    const email = `${id.trim()}@codehow.local`

    try {
      if (isLogin) {
        const res = await fetch('/api/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id.trim() }),
        })
        const data = (await res.json()) as { exists: boolean }

        if (!data.exists) {
          setError("Aucun compte n'existe avec cet identifiant.")
          return
        }

        const { error: signInError } = await authClient.signIn.email({
          email,
          password: passcode,
        })
        if (signInError) {
          setError(signInError.message || 'Le mot de passe est incorrect.')
          return
        }
      } else {
        const { error: signUpError } = await authClient.signUp.email({
          name: id.trim(),
          email,
          password: passcode,
        })
        if (signUpError) {
          setError(signUpError.message || "Erreur lors de l'inscription.")
          return
        }
      }

      await navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Code How?</h1>
          <p>
            {isLogin
              ? 'Connectez-vous à votre compte'
              : 'Créez un nouveau compte'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="id">Identifiant</label>
            <input
              type="text"
              id="id"
              className="form-control"
              placeholder="Ex : thomas"
              autoComplete="username"
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
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={isLoading}
              minLength={8}
            />
          </div>

          {error && (
            <div className="error-message" role="alert">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading
              ? 'Patientez…'
              : isLogin
                ? 'Se connecter'
                : "S'inscrire"}
          </button>
        </form>

        <div className="toggle-mode">
          {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
          <Link to={isLogin ? '/register' : '/login'}>
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </Link>
        </div>
      </div>
    </div>
  )
}
