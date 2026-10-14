import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { CheckCircle2, CircleAlert, MessageSquare, Scale, XCircle } from 'lucide-react'

import { challengesApi, type AttemptSubmitted, type GroundTruthItem } from '../api/challenges'
import DiffViewer, { type DiffLine } from '../components/DiffViewer'
import FeedbackMessage from '../components/FeedbackMessage'
import LoadingScreen from '../components/LoadingScreen'
import { describeNetworkError } from '../errors/network-error'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS, SEVERITY_LABELS, label } from '../labels'

/** Lignes fautives du diff suivies de leur correction attendue. */
function fixLines(attempt: AttemptSubmitted, issue: GroundTruthItem): DiffLine[] {
  const file = attempt.scenario.files.find((f) => f.path === issue.file)
  const faulty: DiffLine[] = (file?.lines ?? [])
    .filter((l) => l.newLineNumber !== undefined && issue.lines.includes(l.newLineNumber))
    .map((l) => ({ type: 'delete', code: l.code, oldLineNumber: l.newLineNumber }))
  const firstLine = issue.lines[0] ?? 1
  const fixed: DiffLine[] = issue.fixed_lines.map((code, i) => ({
    type: 'add',
    code,
    newLineNumber: firstLine + i,
  }))
  return [...faulty, ...fixed]
}

function Meter({ name, value, max }: { name: string; value: number; max: number }) {
  return (
    <div className="result-meter">
      <div className="result-meter-head">
        <span>{name}</span>
        <span>
          {value} / {max}
        </span>
      </div>
      <progress value={value} max={max} aria-label={`${name} : ${value} sur ${max}`} />
    </div>
  )
}

export default function ReviewResult() {
  const { challengeId = '' } = useParams()
  const [attempt, setAttempt] = useState<AttemptSubmitted | null>(null)
  const [notSubmitted, setNotSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    challengesApi
      .get(challengeId)
      .then((data) => {
        if (cancelled) return
        if (data.status === 'in_progress') setNotSubmitted(true)
        else setAttempt(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(describeNetworkError(err) ?? (err instanceof Error ? err.message : 'Impossible de charger le débriefing.'))
      })
    return () => {
      cancelled = true
    }
  }, [challengeId])

  if (notSubmitted) return <Navigate to={`/review/${challengeId}`} replace />

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card dashboard">
          <h2>Débriefing</h2>
          <FeedbackMessage kind="error">{error}</FeedbackMessage>
          <Link to="/dashboard" className="btn btn-primary review-link-btn">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  if (!attempt) return <LoadingScreen label="Chargement du débriefing…" />

  const { scenario, scoreBreakdown: b } = attempt
  const falsePositives = attempt.comments.filter((c) => c.matched_issue_id === null)

  return (
    <div className="review-page">
      <section className="pr-card result-summary" aria-labelledby="result-title">
        <div className="result-score">
          <div className="score-circle result-score-circle" aria-hidden="true">
            {attempt.score}
          </div>
          <div>
            <p className="result-kicker">Note : {attempt.score} sur 100</p>
            <h1 id="result-title" className="pr-title">
              {scenario.title}
            </h1>
            <div className="pr-tags">
              <span className="pr-category-tag">{label(LANGUAGE_LABELS, scenario.language)}</span>
              <span className="pr-category-tag">{label(DIFFICULTY_LABELS, scenario.difficulty)}</span>
              <span className="pr-category-tag">{label(CATEGORY_LABELS, scenario.category)}</span>
            </div>
          </div>
        </div>

        <div className="result-meters">
          <Meter name={`Anomalies trouvées (${b.found}/${b.total})`} value={b.detection} max={60} />
          <Meter name="Qualité des explications" value={b.explanation} max={30} />
          <Meter name={`Précision (${b.false_positives} faux positif${b.false_positives > 1 ? 's' : ''})`} value={b.precision} max={10} />
        </div>

        <div className="result-judge">
          <div className="ticket-label">
            <Scale size={14} aria-hidden="true" />
            <span>Synthèse du juge</span>
          </div>
          <p>{attempt.aiSummary}</p>
          {attempt.judgedBy === 'heuristic' && (
            <FeedbackMessage kind="info">
              Le juge IA était indisponible : seules les lignes pointées ont été comparées.
            </FeedbackMessage>
          )}
        </div>
      </section>

      <section aria-labelledby="issues-title">
        <h2 id="issues-title" className="result-section-title">
          Anomalies attendues
        </h2>
        {scenario.groundTruth.map((issue) => {
          const matches = attempt.comments.filter((c) => c.matched_issue_id === issue.id)
          const found = matches.length > 0
          return (
            <article key={issue.id} className={`pr-card result-issue ${found ? 'is-found' : 'is-missed'}`}>
              <header className="result-issue-head">
                <span className={`result-status ${found ? 'status-found' : 'status-missed'}`}>
                  {found ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
                  {found ? 'Trouvée' : 'Manquée'}
                </span>
                <span className="pr-category-tag">Gravité : {label(SEVERITY_LABELS, issue.severity)}</span>
                <code className="result-location">
                  {issue.file}:{issue.line_number}
                </code>
              </header>

              <h3 className="result-issue-title">{issue.expected_issue}</h3>
              <p className="result-issue-why">{issue.why}</p>

              {matches.map((c) => (
                <div key={`${c.file_path}:${c.line_number}`} className="result-comparison">
                  <div className="result-comparison-col">
                    <div className="detail-header accent">
                      <MessageSquare size={14} aria-hidden="true" /> Votre remarque (ligne {c.line_number})
                    </div>
                    <p>{c.text}</p>
                  </div>
                  <div className="result-comparison-col">
                    <div className="detail-header">
                      <Scale size={14} aria-hidden="true" /> Avis du juge — clarté {c.clarity_score} / 100
                    </div>
                    <p>{c.feedback}</p>
                  </div>
                </div>
              ))}

              <div className="result-fix">
                <div className="detail-header success">
                  <CheckCircle2 size={14} aria-hidden="true" /> Correctif attendu
                </div>
                <p>{issue.ideal_fix}</p>
                {issue.fixed_lines.length > 0 && (
                  <div className="pr-card">
                    <DiffViewer filename={issue.file} lines={fixLines(attempt, issue)} />
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>

      {falsePositives.length > 0 && (
        <section aria-labelledby="fp-title">
          <h2 id="fp-title" className="result-section-title">
            Remarques hors cible
          </h2>
          {falsePositives.map((c) => (
            <article key={`${c.file_path}:${c.line_number}`} className="pr-card result-issue">
              <header className="result-issue-head">
                <span className="result-status status-neutral">
                  <CircleAlert size={16} aria-hidden="true" /> Faux positif
                </span>
                <code className="result-location">
                  {c.file_path}:{c.line_number}
                </code>
              </header>
              <p>{c.text}</p>
              <p className="result-issue-why">{c.feedback}</p>
            </article>
          ))}
        </section>
      )}

      <div className="result-actions">
        <Link to="/dashboard" className="btn btn-primary review-link-btn">
          Nouveau challenge
        </Link>
      </div>
    </div>
  )
}
