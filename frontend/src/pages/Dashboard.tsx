import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Code2,
  PlayCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { challengesApi, type AttemptInProgressSummary, type AttemptSummary } from '../api/challenges'
import ChallengeLauncher from '../components/ChallengeLauncher'
import ScoreChart from '../components/ScoreChart'
import FeedbackMessage from '../components/FeedbackMessage'
import LoadingScreen from '../components/LoadingScreen'
import { describeNetworkError } from '../errors/network-error'
import { useI18n } from '@/i18n'
import { getAuditorRank, PASSING_SCORE } from '../auditor-rank'
import { SCORE_VERDICT_KEYS, scoreLevel } from '../score-level'
import {
  getCategoryLabels,
  getDifficultyLabels,
  LANGUAGE_LABELS,
  label,
} from '../labels'

export default function Dashboard() {
  const { locale, t, formatDate } = useI18n()

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)
  const [history, setHistory] = useState<AttemptSummary[] | null>(null)
  const [inProgress, setInProgress] = useState<AttemptInProgressSummary[]>([])
  const [historyError, setHistoryError] = useState('')

  const categoryLabels = getCategoryLabels(locale)
  const difficultyLabels = getDifficultyLabels(locale)

  useEffect(() => {
    let cancelled = false
    challengesApi
      .history()
      .then(({ attempts, inProgress }) => {
        if (cancelled) return
        setHistory(attempts)
        setInProgress(inProgress)
        setExpandedTheme(attempts[attempts.length - 1]?.category ?? null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHistoryError(describeNetworkError(err, locale) ?? t('dashboard.historyError'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [locale, t])

  const allHistory = history ?? []
  const themes = Array.from(new Set(allHistory.map((s) => s.category)))
  const selectedScenario = allHistory.find((s) => s.id === selectedScenarioId)

  const filteredHistory = expandedTheme
    ? allHistory.filter((s) => s.category === expandedTheme)
    : allHistory

  const chartData = [...filteredHistory]
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .map((s) => ({
      label: formatDate(s.submittedAt, { day: 'numeric', month: 'short' }),
      score: s.score,
    }))

  const totalScenarios = filteredHistory.length
  const averageScore =
    totalScenarios > 0
      ? Math.round(filteredHistory.reduce((acc, curr) => acc + curr.score, 0) / totalScenarios)
      : 0
  const bestScore = totalScenarios > 0 ? Math.max(...filteredHistory.map((s) => s.score)) : 0
  const lastScore = totalScenarios > 0 ? filteredHistory[filteredHistory.length - 1].score : 0

  const rankInfo = getAuditorRank(
    allHistory.map((attempt) => attempt.score),
    t,
  )

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero-section" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-container">
          <h1 id="dashboard-title" className="hero-title">
            {t('dashboard.heroTitle')} <span className="hero-title-highlight">{t('dashboard.heroTitleHighlight')}</span>
          </h1>
          <p className="hero-description">{t('dashboard.heroDesc')}</p>
        </div>
      </section>

      <section className="dashboard-content-section" aria-label={t('dashboard.workspaceAria')}>
        <div className="dashboard-grid">
          <div className="dashboard-panel history-panel">
            <div className="panel-title">
              <div className="panel-title-main">
                <BookOpen className="panel-title-icon" size={20} aria-hidden="true" />
                <h2>{t('dashboard.historyTitle')}</h2>
              </div>
              {allHistory.length > 0 && (
                <span
                  className="panel-badge"
                  title={t('dashboard.challengesCompleted', { count: allHistory.length })}
                >
                  {allHistory.length}
                </span>
              )}
            </div>

            <button
              type="button"
              className={`btn-new-challenge-banner ${selectedScenarioId === null ? 'is-active' : ''}`}
              onClick={() => setSelectedScenarioId(null)}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{t('dashboard.newChallenge')}</span>
            </button>

            {inProgress.length > 0 && (
              <section className="in-progress" aria-labelledby="in-progress-title">
                <h3 id="in-progress-title" className="in-progress-title">
                  <PlayCircle size={16} aria-hidden="true" /> {t('dashboard.inProgressTitle')}
                </h3>
                <ul className="in-progress-list">
                  {inProgress.map((attempt) => (
                    <li key={attempt.id}>
                      <Link to={`/review/${attempt.id}`} className="in-progress-item">
                        <span className="scenario-title">{attempt.title}</span>
                        <span className="scenario-meta">
                          <span className="meta-tag">
                            <Code2 size={12} aria-hidden="true" /> {label(LANGUAGE_LABELS, attempt.language, locale)}
                          </span>
                          <span className="meta-tag">
                            {attempt.isMystery ? t('review.mysteryMode') : label(difficultyLabels, attempt.difficulty, locale)}
                          </span>
                          <span className="scenario-date">
                            {formatDate(attempt.startedAt, { day: 'numeric', month: 'short' })}
                          </span>
                        </span>
                        <span className="in-progress-resume">
                          {t('dashboard.resume')} <ArrowRight size={14} aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="scenario-list">
              {history === null && !historyError && (
                <LoadingScreen label={t('dashboard.loadingHistory')} />
              )}
              {historyError && <FeedbackMessage kind="error">{historyError}</FeedbackMessage>}
              {history?.length === 0 && (
                <div className="empty-history-box">
                  <BookOpen size={32} className="empty-history-icon" aria-hidden="true" />
                  <p className="empty-history-title">{t('dashboard.emptyHistoryTitle')}</p>
                  <p className="empty-history-sub">{t('dashboard.emptyHistorySub')}</p>
                </div>
              )}
              {themes.map((theme) => {
                const scenariosForTheme = allHistory.filter((s) => s.category === theme)
                const isExpanded = expandedTheme === theme
                return (
                  <div key={theme} className="theme-group">
                    <button
                      type="button"
                      className={`theme-header ${isExpanded ? 'active' : ''}`}
                      onClick={() => setExpandedTheme(isExpanded ? null : theme)}
                      aria-expanded={isExpanded}
                    >
                      <span className="theme-header-left">
                        {theme === 'security_owasp' ? (
                          <ShieldAlert size={16} aria-hidden="true" />
                        ) : (
                          <Zap size={16} aria-hidden="true" />
                        )}
                        <span>{label(categoryLabels, theme, locale)}</span>
                      </span>
                      <span className="theme-header-right">
                        <span className="theme-count">{scenariosForTheme.length}</span>
                        <ChevronDown className={`theme-chevron ${isExpanded ? 'open' : ''}`} size={16} aria-hidden="true" />
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="theme-scenarios">
                        {scenariosForTheme.map((scenario) => (
                          <div
                            key={scenario.id}
                            role="button"
                            tabIndex={0}
                            className={`scenario-item ${selectedScenarioId === scenario.id ? 'active' : ''}`}
                            onClick={() => setSelectedScenarioId(scenario.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedScenarioId(scenario.id)
                              }
                            }}
                          >
                            <div className="scenario-header">
                              <div className="scenario-title">{scenario.title}</div>
                              <div
                                className={`scenario-score ${scoreLevel(scenario.score)}`}
                              >
                                {scenario.score}%
                              </div>
                            </div>
                            <div className="scenario-meta">
                              <span className="meta-tag">
                                <Code2 size={12} aria-hidden="true" /> {label(LANGUAGE_LABELS, scenario.language, locale)}
                              </span>
                              <span className="meta-tag">{label(difficultyLabels, scenario.difficulty, locale)}</span>
                              <span className="scenario-date">
                                {formatDate(scenario.submittedAt, {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dashboard-panel main-panel">
            <div className="panel-title">
              <div className="panel-title-main">
                {selectedScenario ? (
                  <>
                    <Activity className="panel-title-icon" size={20} aria-hidden="true" />
                    <h2>{t('dashboard.challengeDetails')}</h2>
                  </>
                ) : (
                  <>
                    <Sparkles className="panel-title-icon" size={20} aria-hidden="true" />
                    <h2>{t('dashboard.newChallenge')}</h2>
                  </>
                )}
              </div>
              {selectedScenario && (
                <button
                  type="button"
                  className="btn-switch-launcher"
                  onClick={() => setSelectedScenarioId(null)}
                  title={t('dashboard.newChallenge')}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{t('dashboard.newChallenge')}</span>
                </button>
              )}
            </div>

            <div className="scenario-details">
              {selectedScenario ? (
                <>
                  <div className="score-hero-block">
                    <div
                      className={`score-badge-circle ${scoreLevel(selectedScenario.score)}`}
                    >
                      <span className="score-number">{selectedScenario.score}</span>
                      <span className="score-pct">%</span>
                    </div>
                    <div className="score-hero-text">
                      <div className="score-badge-label">
                        {t(SCORE_VERDICT_KEYS[scoreLevel(selectedScenario.score)])}
                      </div>
                      <h3>{t('dashboard.evalScore')}</h3>
                      <p>{t('dashboard.scoreHelp')}</p>
                    </div>
                  </div>

                  <div className="scenario-detail-card">
                    <div className="scenario-detail-head">
                      <Code2 size={16} aria-hidden="true" />
                      <span>{selectedScenario.title}</span>
                    </div>
                    <div className="scenario-detail-body">
                      <div className="scenario-tags-row">
                        <span className="tag-badge">
                          <strong>{t('dashboard.language')}</strong> {label(LANGUAGE_LABELS, selectedScenario.language, locale)}
                        </span>
                        <span className="tag-badge">
                          <strong>{t('dashboard.level')}</strong> {label(difficultyLabels, selectedScenario.difficulty, locale)}
                        </span>
                        <span className="tag-badge">
                          <strong>{t('dashboard.category')}</strong> {label(categoryLabels, selectedScenario.category, locale)}
                        </span>
                      </div>
                      <div className="scenario-submitted-date">
                        <Calendar size={14} aria-hidden="true" />
                        <span>
                          {t('dashboard.completedOn', {
                            date: formatDate(selectedScenario.submittedAt, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }),
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="scenario-detail-actions">
                    <Link to={`/review/${selectedScenario.id}/result`} className="btn-debrief-primary">
                      <CheckCircle2 size={18} aria-hidden="true" />
                      <span>{t('dashboard.viewFullDebrief')}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedScenarioId(null)}
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span>{t('dashboard.launchAnother')}</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="launcher-intro-card">
                    <p>{t('dashboard.launcherIntro')}</p>
                  </div>
                  <ChallengeLauncher />
                </>
              )}
            </div>
          </div>

          <div className="dashboard-panel progression-panel">
            <div className="panel-title">
              <div className="panel-title-main">
                <Award className="panel-title-icon" size={20} aria-hidden="true" />
                <h2>{t('dashboard.progressionTitle')}</h2>
              </div>
              {expandedTheme && (
                <span className="filter-active-pill" title={`${t('dashboard.filterPrefix')} ${label(categoryLabels, expandedTheme, locale)}`}>
                  {label(categoryLabels, expandedTheme, locale)}
                </span>
              )}
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <BookOpen size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{totalScenarios}</div>
                <div className="stat-label">{t('dashboard.statScenarios')}</div>
              </div>
              <div className="stat-card">
                <TrendingUp size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{averageScore}%</div>
                <div className="stat-label">{t('dashboard.statAvg')}</div>
              </div>
              <div className="stat-card">
                <Award size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{bestScore}%</div>
                <div className="stat-label">{t('dashboard.statBest')}</div>
              </div>
              <div className="stat-card">
                <Target size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{totalScenarios > 0 ? `${lastScore}%` : '—'}</div>
                <div className="stat-label">{t('dashboard.statLast')}</div>
              </div>
            </div>

            <div className="chart-header">
              <span>{t('dashboard.scoreEvolution')}</span>
              {filteredHistory.length > 0 && (
                <span className="chart-count">
                  {t('dashboard.pointCount', {
                    count: filteredHistory.length,
                    s: filteredHistory.length > 1 ? 's' : '',
                  })}
                </span>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="chart-empty-state">
                <TrendingUp size={32} className="chart-empty-icon" aria-hidden="true" />
                <p>{t('dashboard.noScoreData')}</p>
                <span>{t('dashboard.noScoreDataSub')}</span>
              </div>
            ) : (
              <div className="chart-container">
                <ScoreChart points={chartData} title={t('dashboard.scoreEvolution')} />
              </div>
            )}

            <div className="auditor-rank-card">
              <div className="rank-header">
                <span className="rank-title">{t('dashboard.auditorRank')}</span>
                <span className="rank-badge">{rankInfo.title}</span>
              </div>
              <div className="rank-progress-bar">
                <div className="rank-progress-fill" style={{ width: `${rankInfo.progress}%` }} />
              </div>
              <p className="rank-desc">{rankInfo.desc}</p>
              <p className="rank-rule">{t('dashboard.rankRule', { min: PASSING_SCORE })}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}