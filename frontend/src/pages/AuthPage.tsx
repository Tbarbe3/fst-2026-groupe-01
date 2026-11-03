import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'

import { authClient } from '../auth'
import FeedbackMessage from '../components/FeedbackMessage'
import { translateAuthError } from '../errors/auth-errors'
import { describeNetworkError } from '../errors/network-error.ts'
import {
  describePasswordPolicy,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from '../errors/password-policy.ts'
import { useI18n } from '@/i18n'

interface AuthPageProps {
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password'
}

interface LocationState {
  from?: string
  successMessage?: string
}

export default function AuthPage({ mode }: AuthPageProps) {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isForgotPassword = mode === 'forgot-password'
  const isResetPassword = mode === 'reset-password'

  const locationState = location.state as LocationState | null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(locationState?.successMessage || '')
  const [demoResetUrl, setDemoResetUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // `/login`, `/register`, etc. partagent cette position dans l'arbre : React
  // réutilise l'instance et l'état survit à la navigation. Ajusté pendant le
  // rendu et non dans un effet, pour qu'aucune erreur obsolète ne soit peinte.
  const [renderedMode, setRenderedMode] = useState(mode)
  if (renderedMode !== mode) {
    setRenderedMode(mode)
    setError('')
    setSuccess(locationState?.successMessage || '')
    setDemoResetUrl('')
    setPassword('')
    setPasswordConfirm('')
  }

  // La connexion n'applique que la longueur, pas la politique complète : un
  // mot de passe créé avant son renforcement doit continuer à fonctionner.
  const validate = (): string | null => {
    if (isForgotPassword) {
      if (!email.trim()) return t('auth.emailRequired')
      return null
    }

    if (isResetPassword) {
      if (!token) return t('auth.resetPasswordMissingToken')
      const passwordError = validatePassword(password, locale)
      if (passwordError) return passwordError
      if (password !== passwordConfirm) {
        return t('auth.passwordsDoNotMatch')
      }
      return null
    }

    if (!email.trim()) return t('auth.emailRequired')
    if (isRegister && !name.trim()) return t('auth.nameRequired')

    if (isLogin) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return t('errors.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
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
    setSuccess('')
    setIsLoading(true)

    try {
      if (isForgotPassword) {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })
        const data = await response.json()
        if (!response.ok) {
          setError(data.message || t('common.genericError'))
          return
        }
        setSuccess(t('auth.forgotPasswordSent'))
        if (data.resetUrl) {
          setDemoResetUrl(data.resetUrl)
        }
        return
      }

      if (isResetPassword) {
        const { error: resetError } = await authClient.resetPassword({
          newPassword: password,
          token,
        })
        if (resetError) {
          setError(translateAuthError(resetError, 'errors.generic', locale))
          return
        }
        await navigate('/login', {
          replace: true,
          state: { successMessage: t('auth.resetPasswordSuccess') },
        })
        return
      }

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
        // « compte inconnu » de « mot de passe incorrect » révélerait qui est inscrit.
        setError(
          isLogin
            ? t('auth.invalidCredentials')
            : translateAuthError(authError, 'errors.signUpFailed', locale),
        )
        return
      }

      const from = locationState?.from
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
    <div className={`auth-container${isLogin || isForgotPassword || isResetPassword ? '' : ' auth-container-wide'}`}>
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
              : isRegister
                ? t('auth.registerTitle')
                : isForgotPassword
                  ? t('auth.forgotPasswordTitle')
                  : t('auth.resetPasswordTitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {isLogin && (
            <>
              {emailField}
              {passwordField}
              <div className="forgot-password-link-container">
                <Link to="/forgot-password" className="forgot-password-link">
                  {t('auth.forgotPasswordLink')}
                </Link>
              </div>
            </>
          )}

          {isRegister && (
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
                  <small className="form-hint">{t('auth.nameHint')}</small>
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

          {isForgotPassword && (
            <>
              {emailField}
              {demoResetUrl && (
                <div className="reset-demo-notice">
                  <p>{t('auth.forgotPasswordDemoNotice')}</p>
                  <Link to={demoResetUrl} className="btn btn-primary btn-reset-direct">
                    {t('auth.forgotPasswordDirectBtn')}
                  </Link>
                </div>
              )}
            </>
          )}

          {isResetPassword && (
            <>
              {!token ? (
                <div className="reset-demo-notice">
                  <p>{t('auth.resetPasswordMissingToken')}</p>
                  <Link to="/forgot-password" className="forgot-password-link">
                    {t('auth.requestNewResetLink')}
                  </Link>
                </div>
              ) : (
                <>
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
                </>
              )}
            </>
          )}

          {/* Hauteur animée sans espace réservé si aucun message n'est actif. */}
          <div className="form-feedback" data-visible={Boolean(error || success)}>
            <div>
              {error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}
              {success && !error && (
                <FeedbackMessage kind="success">{success}</FeedbackMessage>
              )}
            </div>
          </div>

          {(!isResetPassword || Boolean(token)) && (!isForgotPassword || !demoResetUrl) && (
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading
                ? t('auth.pleaseWait')
                : isLogin
                  ? t('auth.signInBtn')
                  : isRegister
                    ? t('auth.signUpBtn')
                    : isForgotPassword
                      ? t('auth.forgotPasswordSubmitBtn')
                      : t('auth.resetPasswordBtn')}
            </button>
          )}
        </form>

        <div className="toggle-mode">
          {isLogin || isRegister ? (
            <>
              <span>{isLogin ? t('auth.noAccount') : t('auth.hasAccount')}</span>
              <Link to={isLogin ? '/register' : '/login'}>
                {isLogin ? t('auth.signUpBtn') : t('auth.signInBtn')}
              </Link>
            </>
          ) : (
            <Link to="/login">{t('auth.backToLogin')}</Link>
          )}
        </div>
      </div>
    </div>
  )
}
