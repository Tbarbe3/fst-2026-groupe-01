import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { authClient } from '../auth'
import FeedbackMessage from '../components/FeedbackMessage'

const MIN_PASSWORD_LENGTH = 8

interface AuthPageProps {
  mode: 'login' | 'register'
}

interface LocationState {
  from?: string
}

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const isLogin = mode === 'login'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): string | null => {
    if (!email.trim()) return "L'adresse e-mail est requise."
    if (!isLogin && !name.trim()) return 'Le pseudonyme est requis.'
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    }
    if (!isLogin && password !== passwordConfirm) {
      return 'Les deux mots de passe ne correspondent pas.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const { error: authError } = isLogin
        ? await authClient.signIn.email({
            email: email.trim(),
            password,
          })
        : await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })

      if (authError) {
        // Message volontairement indifférencié à la connexion : distinguer
        // « compte inconnu » de « mot de passe incorrect » révélerait quelles
        // adresses sont inscrites.
        setError(
          isLogin
            ? 'Adresse e-mail ou mot de passe incorrect.'
            : authError.message || "L'inscription a échoué.",
        )
        return
      }

      const from = (location.state as LocationState | null)?.from
      await navigate(from ?? '/dashboard', { replace: true })
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

        <form onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Pseudonyme</label>
              <input
                type="text"
                id="name"
                className="form-control"
                placeholder="Ex : thomas"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                maxLength={60}
              />
              <small className="form-hint">
                Visible par les autres utilisateurs.
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="vous@exemple.fr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              maxLength={254}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              maxLength={128}
            />
            {!isLogin && (
              <small className="form-hint">
                {MIN_PASSWORD_LENGTH} caractères minimum.
              </small>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="passwordConfirm">Confirmez le mot de passe</label>
              <input
                type="password"
                id="passwordConfirm"
                className="form-control"
                placeholder="••••••••"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLoading}
                maxLength={128}
              />
            </div>
          )}

          <div className="form-feedback">
            {error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading
              ? 'Patientez…'
              : isLogin
                ? 'Se connecter'
                : "S'inscrire"}
          </button>
        </form>

        <div className="toggle-mode">
          <span>{isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}</span>
          <Link to={isLogin ? '/register' : '/login'}>
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </Link>
        </div>
      </div>
    </div>
  )
}
