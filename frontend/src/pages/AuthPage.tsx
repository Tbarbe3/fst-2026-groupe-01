import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'

import { authClient } from '../auth'
import FeedbackMessage from '../components/FeedbackMessage'
import { describeNetworkError } from '../errors/network-error.ts'
import {
  describePasswordPolicy,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  validatePassword,
} from '../errors/password-policy.ts'
import { useI18n, type Locale } from '../i18n'

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
function translateSignUpError(error: AuthError, locale: Locale): string {
  if (locale === 'en') {
    switch (error.code) {
      case 'USER_ALREADY_EXISTS':
      case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
        return 'An account already exists with this email address.'
      case 'INVALID_EMAIL':
        return 'Invalid email address.'
      case 'PASSWORD_TOO_SHORT':
        return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
      case 'PASSWORD_TOO_LONG':
        return `Password is too long (${MAX_PASSWORD_LENGTH} characters maximum).`
      case 'WEAK_PASSWORD':
        return error.message || describePasswordPolicy('en')
      default:
        return 'Registration failed. Please check the information entered.'
    }
  }

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
      return error.message || describePasswordPolicy('fr')
    default:
      return "L'inscription a échoué. Vérifiez les informations saisies."
  }
}

export default function AuthPage({ mode }: AuthPageProps) {
  const { locale, t } = useI18n()
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
    if (!email.trim()) return t('auth.emailRequired')
    if (!isLogin && !name.trim()) return t('auth.nameRequired')

    if (isLogin) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return t('auth.passwordLength', { min: MIN_PASSWORD_LENGTH })
      }
      return null
    }

    const passwordError = validatePassword(password, locale)
    if (passwordError) return passwordError
    if (password !== passwordConfirm) {
      return t('auth.passwordsDoNotMatch')
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
            ? t('auth.invalidCredentials')
            : translateSignUpError(authError, locale),
        )
        return
      }

      const from = (location.state as LocationState | null)?.from
      await navigate(from && from !== '/dashboard' ? from : '/', { replace: true })
    } catch (err: unknown) {
      setError(describeNetworkError(err, locale) ?? t('common.genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  const emailField = (
    <div className="form-group">
      <label htmlFor="email">{t('auth.emailLabel')}</label>
      <input
        type="email"
        id="email"
        className="form-control"
        placeholder={t('auth.emailPlaceholder')}
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
      <label htmlFor="password">{t('auth.passwordLabel')}</label>
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
        <small className="form-hint">{describePasswordPolicy(locale)}</small>
      )}
    </div>
  )

  return (
    <div className={`auth-container${isLogin ? '' : ' auth-container-wide'}`}>
      <div className="auth-card">
        <div className="auth-top-nav">
          <Link to="/" className="btn-back-home" aria-label={t('common.backToHome')}>
            <ArrowLeft size={16} />
            <span>{t('common.backToHome')}</span>
          </Link>
        </div>

        <div className="auth-header">
          <h1>
            <Link to="/" className="auth-brand-link" title={t('common.backToHome')}>
              Code How?
            </Link>
          </h1>
          <p>
            {isLogin
              ? t('auth.loginTitle')
              : t('auth.registerTitle')}
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
                  <label htmlFor="name">{t('auth.nameLabel')}</label>
                  <input
                    type="text"
                    id="name"
                    className="form-control"
                    placeholder={t('auth.namePlaceholder')}
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    maxLength={60}
                  />
                  <small className="form-hint">
                    {t('auth.nameHint')}
                  </small>
                </div>
                {emailField}
              </div>

              <div className="form-row">
                {passwordField}
                <div className="form-group">
                  <label htmlFor="passwordConfirm">
                    {t('auth.passwordConfirmLabel')}
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
              ? t('auth.pleaseWait')
              : isLogin
                ? t('auth.signInBtn')
                : t('auth.signUpBtn')}
          </button>
        </form>

        <div className="toggle-mode">
          <span>{isLogin ? t('auth.noAccount') : t('auth.hasAccount')}</span>
          <Link to={isLogin ? '/register' : '/login'}>
            {isLogin ? t('auth.signUpBtn') : t('auth.signInBtn')}
          </Link>
        </div>
      </div>
    </div>
  )
}
