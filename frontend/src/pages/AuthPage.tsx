import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { authClient } from '../auth'
import FeedbackMessage from '../components/FeedbackMessage'
import { describeNetworkError } from '../errors/network-error.ts'
import {
  describePasswordPolicy,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from '../errors/password-policy.ts'

interface AuthPageProps {
  mode: 'login' | 'register'
}

interface LocationState {
  from?: string
}

interface AuthError {
  code?: string
  message?: string
}

/**
 * Traduit par `code`, pas par le `message` anglais — stable si le texte
 * change. « Adresse déjà utilisée » divulgue un compte : compromis assumé
 * faute de réinitialisation de mot de passe. Cf. BACKLOG.md, entrée 12.
 */
function translateSignUpError(error: AuthError): string {
  switch (error.code) {
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Un compte existe déjà avec cette adresse e-mail.'
    case 'INVALID_EMAIL':
      return "L'adresse e-mail n'est pas valide."
    case 'PASSWORD_TOO_SHORT':
      return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    case 'PASSWORD_TOO_LONG':
      return 'Le mot de passe est trop long.'
    case 'WEAK_PASSWORD':
      // Message déjà en français, produit par la politique du serveur.
      return error.message || describePasswordPolicy()
    default:
      return "L'inscription a échoué. Vérifiez les informations saisies."
  }
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

  // `/login` et `/register` partagent cette position dans l'arbre : React
  // réutilise l'instance et l'état survit à la navigation. Ajusté pendant le
  // rendu et non dans un effet, pour qu'aucune erreur obsolète ne soit peinte.
  const [renderedMode, setRenderedMode] = useState(mode)
  if (renderedMode !== mode) {
    setRenderedMode(mode)
    setError('')
    setPassword('')
    setPasswordConfirm('')
  }

  // La connexion n'applique que la longueur, pas la politique complète : un
  // mot de passe créé avant son renforcement doit continuer à fonctionner.
  // Le serveur applique la même règle (cf. password-policy.ts côté backend).
  const validate = (): string | null => {
    if (!email.trim()) return "L'adresse e-mail est requise."
    if (!isLogin && !name.trim()) return 'Le pseudonyme est requis.'

    if (isLogin) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      }
      return null
    }

    const passwordError = validatePassword(password)
    if (passwordError) return passwordError
    if (password !== passwordConfirm) {
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
        // À la connexion, message volontairement indifférencié : distinguer
        // « compte inconnu » de « mot de passe incorrect » révélerait quelles
        // adresses sont inscrites.
        setError(
          isLogin
            ? 'Adresse e-mail ou mot de passe incorrect.'
            : translateSignUpError(authError),
        )
        return
      }

      const from = (location.state as LocationState | null)?.from
      await navigate(from ?? '/dashboard', { replace: true })
    } catch (err: unknown) {
      // Un message anglais brut (ex. « Failed to fetch ») ne doit jamais
      // s'afficher : describeNetworkError le reconnaît, sinon repli générique.
      setError(describeNetworkError(err) ?? 'Une erreur est survenue. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  const emailField = (
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
  )

  const passwordField = (
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
        <small className="form-hint">{describePasswordPolicy()}</small>
      )}
    </div>
  )

  return (
    <div className={`auth-container${isLogin ? '' : ' auth-container-wide'}`}>
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
          {isLogin ? (
            <>
              {emailField}
              {passwordField}
            </>
          ) : (
            <>
              <div className="form-row">
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
                {emailField}
              </div>

              <div className="form-row">
                {passwordField}
                <div className="form-group">
                  <label htmlFor="passwordConfirm">
                    Confirmez le mot de passe
                  </label>
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
              </div>
            </>
          )}

          {/* `data-visible` pilote une transition de hauteur : aucun espace
              n'est réservé quand il n'y a pas d'erreur. */}
          <div className="form-feedback" data-visible={Boolean(error)}>
            <div>
              {error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}
            </div>
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
