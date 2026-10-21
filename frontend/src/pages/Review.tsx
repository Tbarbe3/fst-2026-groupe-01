import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  GitPullRequest,
  HelpCircle,
  MessageSquare,
  Pencil,
  Send,
  ShieldAlert,
  Target,
  Terminal,
  Trash2,
} from 'lucide-react'

import {
  challengesApi,
  type AttemptInProgress,
  type ReviewComment,
} from '../api/challenges'
import type { DiffLine } from '../components/DiffViewer'
import DiffViewer from '../components/DiffViewer'
import FeedbackMessage from '../components/FeedbackMessage'
import LoadingScreen from '../components/LoadingScreen'
import ReviewHelp from '../components/ReviewHelp'
import { describeError } from '../errors/network-error'
import { useI18n } from '../i18n'
import {
  getCategoryLabels,
  getDifficultyLabels,
  LANGUAGE_LABELS,
  label,
} from '../labels'

const MAX_COMMENT_LENGTH = 2000

const HELP_SEEN_KEY = 'codehow:review-help-seen'

const keyOf =(path: string, line: number) => `${path}:${line}`

// Un rechargement de page ne doit pas effacer une revue en cours de rédaction.
const draftKey = (attemptId: string) => `codehow:review:${attemptId}`

function loadDrafts(attemptId: string): Record<string, ReviewComment> {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(attemptId)) ?? '{}')
  } catch {
    return {}
  }
}

export default function Review() {
  const { locale, t } = useI18n()
  const { challengeId = '' } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState<AttemptInProgress | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [comments, setComments] = useState<Record<string, ReviewComment>>(() => loadDrafts(challengeId))
  const [editing, setEditing] = useState<{ path: string; line: number; draft: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)
  // Ouverte d'office à la première partie, pour guider les débutants.
  const [helpOpen, setHelpOpen] = useState(() => !localStorage.getItem(HELP_SEEN_KEY))

  const toggleHelp = (open: boolean) => {
    localStorage.setItem(HELP_SEEN_KEY, '1')
    setHelpOpen(open)
  }

  const categoryLabels = getCategoryLabels(locale)
  const difficultyLabels = getDifficultyLabels(locale)

  useEffect(() => {
    let cancelled = false
    challengesApi
      .get(challengeId)
      .then((data) => {
        if (cancelled) return
        if (data.status === 'submitted') setAlreadySubmitted(true)
        else setAttempt(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(describeError(err, t('review.loadError'), locale))
      })
    return () => {
      cancelled = true
    }
  }, [challengeId, locale, t])

  useEffect(() => {
    sessionStorage.setItem(draftKey(challengeId), JSON.stringify(comments))
  }, [challengeId, comments])

  if (alreadySubmitted) return <Navigate to={`/review/${challengeId}/result`} replace />

  if (loadError) {
    return (
      <div className="auth-container">
        <div className="auth-card dashboard">
          <h2>{t('review.title')}</h2>
          <FeedbackMessage kind="error">{loadError}</FeedbackMessage>
          <Link to="/dashboard" className="btn btn-primary review-link-btn">
            {t('common.backToDashboard')}
          </Link>
        </div>
      </div>
    )
  }

  if (!attempt) return <LoadingScreen label={t('review.loadingPr')} />
  if (submitting) return <LoadingScreen label={t('review.evaluating')} />

  const { scenario } = attempt
  const commentList = Object.values(comments).sort(
    (a, b) => a.file_path.localeCompare(b.file_path) || a.line_number - b.line_number,
  )
  const hasStarted = editing !== null || commentList.length > 0
  const stepDone = (step: number) =>
    (step <= 1 && hasStarted) || (step === 2 && commentList.length > 0)

  const startEditing = (path: string, line: number) => {
    setConfirmApprove(false)
    setEditing({ path, line, draft: comments[keyOf(path, line)]?.text ?? '' })
  }

  const saveDraft = () => {
    if (!editing) return
    const text = editing.draft.trim()
    const key = keyOf(editing.path, editing.line)
    setComments((prev) => {
      const next = { ...prev }
      if (text) next[key] = { file_path: editing.path, line_number: editing.line, text }
      else delete next[key]
      return next
    })
    setEditing(null)
  }

  const removeComment = (path: string, line: number) =>
    setComments((prev) => {
      const next = { ...prev }
      delete next[keyOf(path, line)]
      return next
    })

  const handleSubmit = async () => {
    setSubmitError('')
    setSubmitting(true)
    try {
      await challengesApi.submit(attempt.id, commentList)
      sessionStorage.removeItem(draftKey(attempt.id))
      await navigate(`/review/${attempt.id}/result`, { replace: true })
    } catch (err: unknown) {
      setSubmitError(describeError(err, t('review.submitError'), locale))
      setSubmitting(false)
    }
  }

  const renderAfterLine = (path: string) => (line: DiffLine) => {
    if (line.newLineNumber === undefined) return null
    const lineNumber = line.newLineNumber

    if (editing?.path === path && editing.line === lineNumber) {
      const fieldId = `comment-${path}-${lineNumber}`
      return (
        <form
          className="review-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            saveDraft()
          }}
        >
          <label htmlFor={fieldId} className="review-inline-label">
            {t('review.remarkOnLine', { line: lineNumber })}
          </label>
          <textarea
            id={fieldId}
            className="review-textarea"
            value={editing.draft}
            maxLength={MAX_COMMENT_LENGTH}
            rows={3}
            autoFocus
            placeholder={t('review.textareaPlaceholder')}
            onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(null)
            }}
          />
          <div className="review-inline-actions">
            <button type="button" className="btn-secondary-sm" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm">
              {t('review.saveRemark')}
            </button>
          </div>
        </form>
      )
    }

    const saved = comments[keyOf(path, lineNumber)]
    if (!saved) return null
    return (
      <div className="review-inline-comment">
        <div className="review-inline-comment-head">
          <MessageSquare size={14} aria-hidden="true" />
          <span>{t('review.yourRemarkLine', { line: lineNumber })}</span>
        </div>
        <p className="review-inline-comment-text">{saved.text}</p>
        <div className="review-inline-actions">
          <button type="button" className="btn-secondary-sm" onClick={() => startEditing(path, lineNumber)}>
            <Pencil size={14} aria-hidden="true" /> {t('common.edit')}
          </button>
          <button type="button" className="btn-secondary-sm" onClick={() => removeComment(path, lineNumber)}>
            <Trash2 size={14} aria-hidden="true" /> {t('common.delete')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="review-page">
      <div className="pr-card review-pr-card">
        <div className="pr-header">
          <div className="pr-header-top">
            <div className="pr-title-group">
              <span className="pr-status-badge">
                <GitPullRequest size={14} aria-hidden="true" /> {t('review.prOpen')}
              </span>
              <h1 className="pr-title">{scenario.title}</h1>
            </div>
            <button
              type="button"
              className={`btn-secondary-sm review-help-toggle${helpOpen ? ' active' : ''}`}
              onClick={() => toggleHelp(!helpOpen)}
              aria-expanded={helpOpen}
              aria-controls="review-help"
            >
              <HelpCircle size={16} aria-hidden="true" /> {t('review.help')}
            </button>
          </div>

          <div className="pr-meta-row">
            <div className="pr-author">
              <span className="author-label">{t('home.author')}</span>
              <span className="author-name">{scenario.persona.name}</span>
              {scenario.persona.bio && <span className="author-tag">({scenario.persona.bio})</span>}
            </div>
            <div className="pr-tags">
              <span className="pr-category-tag">{label(LANGUAGE_LABELS, scenario.language, locale)}</span>
              {attempt.isMystery ? (
                <span className="pr-category-tag">
                  <HelpCircle size={12} aria-hidden="true" /> {t('review.mysteryMode')}
                </span>
              ) : (
                <>
                  <span className="pr-category-tag">{label(difficultyLabels, scenario.difficulty, locale)}</span>
                  <span className="pr-category-tag">
                    <ShieldAlert size={12} aria-hidden="true" /> {label(categoryLabels, scenario.category, locale)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="pr-ticket-box">
            <div className="ticket-label">
              <Terminal size={13} aria-hidden="true" />
              <span>{t('review.ticketContext')}</span>
            </div>
            <p className="ticket-text">{scenario.ticketContext}</p>
          </div>

          <p className="review-mission">
            <Target size={16} aria-hidden="true" /> {t('review.mission')}
          </p>

          <ol className="review-steps" aria-label={t('review.stepsAria')}>
            {(['review.step1', 'review.step2', 'review.step3', 'review.step4'] as const).map((key, i) => (
              <li key={key} className={stepDone(i) ? 'done' : ''}>
                <span className="review-step-num" aria-hidden="true">
                  {stepDone(i) ? <Check size={14} /> : i + 1}
                </span>
                {t(key)}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {helpOpen && <ReviewHelp onClose={() => toggleHelp(false)} />}

      <div className="review-layout">
        <div className="review-files">
          {scenario.files.map((file) => (
            <div key={file.path} className="pr-card review-file-card">
              <DiffViewer
                filename={file.path}
                lines={file.lines}
                onCommentLine={(line) => startEditing(file.path, line.newLineNumber!)}
                commentedLines={
                  new Set(commentList.filter((c) => c.file_path === file.path).map((c) => c.line_number))
                }
                renderAfterLine={renderAfterLine(file.path)}
              />
            </div>
          ))}
        </div>

        <aside className="review-sidebar" aria-labelledby="review-sidebar-title">
          <h2 id="review-sidebar-title" className="review-sidebar-title">
            {t('review.remarksSidebar', { count: commentList.length })}
          </h2>
          <p className="review-sidebar-hint">{t('review.sidebarHint')}</p>

          {commentList.length === 0 ? (
            <p className="review-empty-remarks">{t('review.noRemarksYet')}</p>
          ) : (
            <ul className="review-comment-list">
              {commentList.map((c) => (
                <li key={keyOf(c.file_path, c.line_number)}>
                  <button
                    type="button"
                    className="review-comment-link"
                    onClick={() => startEditing(c.file_path, c.line_number)}
                  >
                    <code>
                      {c.file_path.split('/').pop()}:{c.line_number}
                    </code>
                    <span>{c.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="form-feedback" data-visible={Boolean(submitError)}>
            {submitError && <FeedbackMessage kind="error">{submitError}</FeedbackMessage>}
          </div>

          {commentList.length > 0 ? (
            <button type="button" className="btn btn-primary review-submit-btn" onClick={handleSubmit}>
              <Send size={16} aria-hidden="true" />
              {t('review.submitWithRemarks', { count: commentList.length })}
            </button>
          ) : confirmApprove ? (
            <div className="review-approve-confirm" role="alertdialog" aria-labelledby="approve-title" aria-describedby="approve-desc">
              <p id="approve-title" className="review-approve-title">
                <AlertTriangle size={16} aria-hidden="true" /> {t('review.approveWarningTitle')}
              </p>
              <p id="approve-desc">{t('review.approveWarning')}</p>
              <div className="review-inline-actions">
                <button type="button" className="btn-secondary-sm" onClick={() => setConfirmApprove(false)} autoFocus>
                  {t('review.keepReviewing')}
                </button>
                <button type="button" className="btn-primary-sm" onClick={handleSubmit}>
                  {t('review.approveConfirm')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-secondary-sm review-approve-btn" onClick={() => setConfirmApprove(true)}>
              <CheckCircle2 size={16} aria-hidden="true" /> {t('review.approveWithoutRemarks')}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
