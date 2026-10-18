import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  GitPullRequest,
  HelpCircle,
  MessageSquare,
  Pencil,
  Send,
  ShieldAlert,
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
import { describeNetworkError } from '../errors/network-error'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS, label } from '../labels'

const MAX_COMMENT_LENGTH = 2000

const keyOf = (path: string, line: number) => `${path}:${line}`

// Un rechargement de page ne doit pas effacer une revue en cours de rédaction.
const draftKey = (attemptId: string) => `codehow:review:${attemptId}`

function loadDrafts(attemptId: string): Record<string, ReviewComment> {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(attemptId)) ?? '{}')
  } catch {
    return {}
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return describeNetworkError(err) ?? (err instanceof Error ? err.message : fallback)
}

export default function Review() {
  const { challengeId = '' } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState<AttemptInProgress | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [comments, setComments] = useState<Record<string, ReviewComment>>(() => loadDrafts(challengeId))
  const [editing, setEditing] = useState<{ path: string; line: number; draft: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
        if (!cancelled) setLoadError(errorMessage(err, 'Impossible de charger le challenge.'))
      })
    return () => {
      cancelled = true
    }
  }, [challengeId])

  useEffect(() => {
    sessionStorage.setItem(draftKey(challengeId), JSON.stringify(comments))
  }, [challengeId, comments])

  if (alreadySubmitted) return <Navigate to={`/review/${challengeId}/result`} replace />

  if (loadError) {
    return (
      <div className="auth-container">
        <div className="auth-card dashboard">
          <h2>Revue de code</h2>
          <FeedbackMessage kind="error">{loadError}</FeedbackMessage>
          <Link to="/dashboard" className="btn btn-primary review-link-btn">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  if (!attempt) return <LoadingScreen label="Chargement de la pull request…" />
  if (submitting) return <LoadingScreen label="Le juge évalue votre revue…" />

  const { scenario } = attempt
  const commentList = Object.values(comments).sort(
    (a, b) => a.file_path.localeCompare(b.file_path) || a.line_number - b.line_number,
  )

  const startEditing = (path: string, line: number) =>
    setEditing({ path, line, draft: comments[keyOf(path, line)]?.text ?? '' })

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
      setSubmitError(errorMessage(err, 'La soumission a échoué. Réessayez.'))
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
            Remarque sur la ligne {lineNumber}
          </label>
          <textarea
            id={fieldId}
            className="review-textarea"
            value={editing.draft}
            maxLength={MAX_COMMENT_LENGTH}
            rows={3}
            autoFocus
            placeholder="Décrivez le problème, son impact et une piste de correction."
            onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(null)
            }}
          />
          <div className="review-inline-actions">
            <button type="button" className="btn-secondary-sm" onClick={() => setEditing(null)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary-sm">
              Enregistrer la remarque
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
          <span>Votre remarque, ligne {lineNumber}</span>
        </div>
        <p className="review-inline-comment-text">{saved.text}</p>
        <div className="review-inline-actions">
          <button type="button" className="btn-secondary-sm" onClick={() => startEditing(path, lineNumber)}>
            <Pencil size={14} aria-hidden="true" /> Modifier
          </button>
          <button type="button" className="btn-secondary-sm" onClick={() => removeComment(path, lineNumber)}>
            <Trash2 size={14} aria-hidden="true" /> Supprimer
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
                <GitPullRequest size={14} aria-hidden="true" /> PR ouverte
              </span>
              <h1 className="pr-title">{scenario.title}</h1>
            </div>
          </div>

          <div className="pr-meta-row">
            <div className="pr-author">
              <span className="author-label">Auteur :</span>
              <span className="author-name">{scenario.persona.name}</span>
              {scenario.persona.bio && <span className="author-tag">({scenario.persona.bio})</span>}
            </div>
            <div className="pr-tags">
              <span className="pr-category-tag">{label(LANGUAGE_LABELS, scenario.language)}</span>
              {attempt.isMystery ? (
                <span className="pr-category-tag">
                  <HelpCircle size={12} aria-hidden="true" /> Mode Mystère
                </span>
              ) : (
                <>
                  <span className="pr-category-tag">{label(DIFFICULTY_LABELS, scenario.difficulty)}</span>
                  <span className="pr-category-tag">
                    <ShieldAlert size={12} aria-hidden="true" /> {label(CATEGORY_LABELS, scenario.category)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="pr-ticket-box">
            <div className="ticket-label">
              <Terminal size={13} aria-hidden="true" />
              <span>Contexte du ticket métier :</span>
            </div>
            <p className="ticket-text">{scenario.ticketContext}</p>
          </div>
        </div>
      </div>

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
            Vos remarques ({commentList.length})
          </h2>
          <p className="review-sidebar-hint">
            Cliquez sur un numéro de ligne pour signaler un problème. Seules les lignes du nouveau code sont commentables.
          </p>

          {commentList.length > 0 && (
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

          <button type="button" className="btn btn-primary review-submit-btn" onClick={handleSubmit}>
            <Send size={16} aria-hidden="true" />
            {commentList.length > 0 ? 'Soumettre la revue' : 'Approuver sans remarque'}
          </button>
        </aside>
      </div>
    </div>
  )
}
