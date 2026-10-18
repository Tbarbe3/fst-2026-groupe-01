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
  LayoutDashboard,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { challengesApi, type AttemptSummary } from '../api/challenges'
import { authClient } from '../auth'
import ChallengeLauncher from '../components/ChallengeLauncher'
import FeedbackMessage from '../components/FeedbackMessage'
import LoadingScreen from '../components/LoadingScreen'
import { describeNetworkError } from '../errors/network-error'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS, label } from '../labels'

function getAuditorRank(count: number, avgScore: number) {
  if (count === 0) {
    return {
      title: 'Novice',
      progress: 0,
      desc: 'Terminez votre 1ère revue de code pour débloquer le rang d’Apprenti.',
    }
  }
  if (count < 3) {
    return {
      title: 'Apprenti Reviewer',
      progress: Math.round((count / 3) * 100),
      desc: `${3 - count} revue${3 - count > 1 ? 's' : ''} restante${3 - count > 1 ? 's' : ''} pour passer Reviewer Confirmé.`,
    }
  }
  if (count < 8) {
    return {
      title: 'Reviewer Confirmé',
      progress: Math.round(((count - 3) / 5) * 100),
      desc: `${8 - count} revue${8 - count > 1 ? 's' : ''} avant d’atteindre le rang d’Auditeur Senior.`,
    }
  }
  return {
    title: 'Auditeur Senior 🏆',
    progress: 100,
    desc: `Expert de la revue de code avec ${avgScore}% de score moyen.`,
  }
}

export default function Dashboard() {
  const { data: session } = authClient.useSession()
  const displayName = session?.user?.name || session?.user?.email || 'Développeur'

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)
  const [history, setHistory] = useState<AttemptSummary[] | null>(null)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    let cancelled = false
    challengesApi
      .history()
      .then(({ attempts }) => {
        if (cancelled) return
        setHistory(attempts)
        setExpandedTheme(attempts[attempts.length - 1]?.category ?? null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setHistoryError(describeNetworkError(err) ?? "Impossible de charger l'historique.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const allHistory = history ?? []
  const themes = Array.from(new Set(allHistory.map((s) => s.category)))
  const selectedScenario = allHistory.find((s) => s.id === selectedScenarioId)

  const filteredHistory = expandedTheme
    ? allHistory.filter((s) => s.category === expandedTheme)
    : allHistory

  const chartData = [...filteredHistory]
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .map((s) => ({
      name: new Date(s.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      score: s.score,
    }))

  const totalScenarios = filteredHistory.length
  const averageScore =
    totalScenarios > 0
      ? Math.round(filteredHistory.reduce((acc, curr) => acc + curr.score, 0) / totalScenarios)
      : 0
  const bestScore = totalScenarios > 0 ? Math.max(...filteredHistory.map((s) => s.score)) : 0
  const lastScore = totalScenarios > 0 ? filteredHistory[filteredHistory.length - 1].score : 0

  const rankInfo = getAuditorRank(allHistory.length, averageScore)

  return (
    <div className="dashboard-page">
      {/* 1. Hero Section */}
      <section className="dashboard-hero-section" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-container">
          <div className="hero-welcome-badge" role="status">
            <LayoutDashboard size={15} aria-hidden="true" />
            <span>
              Tableau de bord de <strong className="welcome-pseudo">{displayName}</strong>
            </span>
          </div>
          <h1 id="dashboard-title" className="hero-title">
            Votre espace personnel <span className="hero-title-highlight">de progression</span>
          </h1>
          <p className="hero-description">
            Analysez l'historique de vos revues, suivez l'évolution de vos scores et lancez de nouveaux challenges d'entraînement.
          </p>
        </div>
      </section>

      {/* 2. Main Grid */}
      <section className="dashboard-content-section" aria-label="Espace de travail du tableau de bord">
        <div className="dashboard-grid">
          {/* 1. Colonne gauche : Historique */}
          <div className="dashboard-panel history-panel">
            <div className="panel-title">
              <div className="panel-title-main">
                <BookOpen className="panel-title-icon" size={20} aria-hidden="true" />
                <h2>Historique</h2>
              </div>
              {allHistory.length > 0 && (
                <span className="panel-badge" title={`${allHistory.length} challenges terminés`}>
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
              <span>Nouveau challenge</span>
            </button>

            <div className="scenario-list">
              {history === null && !historyError && <LoadingScreen label="Chargement de l'historique…" />}
              {historyError && <FeedbackMessage kind="error">{historyError}</FeedbackMessage>}
              {history?.length === 0 && (
                <div className="empty-history-box">
                  <BookOpen size={32} className="empty-history-icon" aria-hidden="true" />
                  <p className="empty-history-title">Aucune revue terminée</p>
                  <p className="empty-history-sub">Lancez votre premier challenge pour commencer à bâtir votre historique d'audit.</p>
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
                        <span>{label(CATEGORY_LABELS, theme)}</span>
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
                                className={`scenario-score ${
                                  scenario.score >= 80 ? 'high' : scenario.score >= 60 ? 'medium' : 'low'
                                }`}
                              >
                                {scenario.score}%
                              </div>
                            </div>
                            <div className="scenario-meta">
                              <span className="meta-tag">
                                <Code2 size={12} aria-hidden="true" /> {label(LANGUAGE_LABELS, scenario.language)}
                              </span>
                              <span className="meta-tag">{label(DIFFICULTY_LABELS, scenario.difficulty)}</span>
                              <span className="scenario-date">
                                {new Date(scenario.submittedAt).toLocaleDateString('fr-FR', {
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

          {/* 2. Colonne centrale : Détails du Scénario OU Lanceur */}
          <div className="dashboard-panel main-panel">
            <div className="panel-title">
              <div className="panel-title-main">
                {selectedScenario ? (
                  <>
                    <Activity className="panel-title-icon" size={20} aria-hidden="true" />
                    <h2>Détails du challenge</h2>
                  </>
                ) : (
                  <>
                    <Sparkles className="panel-title-icon" size={20} aria-hidden="true" />
                    <h2>Nouveau challenge</h2>
                  </>
                )}
              </div>
              {selectedScenario && (
                <button
                  type="button"
                  className="btn-switch-launcher"
                  onClick={() => setSelectedScenarioId(null)}
                  title="Revenir au lanceur de challenge"
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Nouveau challenge</span>
                </button>
              )}
            </div>

            <div className="scenario-details">
              {selectedScenario ? (
                <>
                  <div className="score-hero-block">
                    <div
                      className={`score-badge-circle ${
                        selectedScenario.score >= 80 ? 'high' : selectedScenario.score >= 60 ? 'medium' : 'low'
                      }`}
                    >
                      <span className="score-number">{selectedScenario.score}</span>
                      <span className="score-pct">%</span>
                    </div>
                    <div className="score-hero-text">
                      <div className="score-badge-label">
                        {selectedScenario.score >= 80
                          ? 'Excellente analyse'
                          : selectedScenario.score >= 60
                            ? 'Bonne analyse'
                            : 'Analyse à perfectionner'}
                      </div>
                      <h3>Score d'évaluation</h3>
                      <p>Ce score reflète la précision de votre détection et la pertinence de vos remarques.</p>
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
                          <strong>Langage :</strong> {label(LANGUAGE_LABELS, selectedScenario.language)}
                        </span>
                        <span className="tag-badge">
                          <strong>Niveau :</strong> {label(DIFFICULTY_LABELS, selectedScenario.difficulty)}
                        </span>
                        <span className="tag-badge">
                          <strong>Catégorie :</strong> {label(CATEGORY_LABELS, selectedScenario.category)}
                        </span>
                      </div>
                      <div className="scenario-submitted-date">
                        <Calendar size={14} aria-hidden="true" />
                        <span>
                          Terminé le{' '}
                          {new Date(selectedScenario.submittedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="scenario-detail-actions">
                    <Link to={`/review/${selectedScenario.id}/result`} className="btn-debrief-primary">
                      <CheckCircle2 size={18} aria-hidden="true" />
                      <span>Consulter le débriefing complet</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedScenarioId(null)}
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span>Lancer un autre challenge</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="launcher-intro-card">
                    <p>
                      Sélectionnez vos critères pour générer un scénario sur-mesure ou tentez le{' '}
                      <strong>mode Mystère</strong> pour un challenge surprise.
                    </p>
                  </div>
                  <ChallengeLauncher />
                </>
              )}
            </div>
          </div>

          {/* 3. Colonne droite : Progression */}
          <div className="dashboard-panel progression-panel">
            <div className="panel-title">
              <div className="panel-title-main">
                <Award className="panel-title-icon" size={20} aria-hidden="true" />
                <h2>Progression</h2>
              </div>
              {expandedTheme && (
                <span className="filter-active-pill" title={`Filtre : ${label(CATEGORY_LABELS, expandedTheme)}`}>
                  {label(CATEGORY_LABELS, expandedTheme)}
                </span>
              )}
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <BookOpen size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{totalScenarios}</div>
                <div className="stat-label">Scénarios</div>
              </div>
              <div className="stat-card">
                <TrendingUp size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{averageScore}%</div>
                <div className="stat-label">Moyenne</div>
              </div>
              <div className="stat-card">
                <Award size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{bestScore}%</div>
                <div className="stat-label">Meilleur</div>
              </div>
              <div className="stat-card">
                <Target size={18} className="stat-card-icon" aria-hidden="true" />
                <div className="stat-value">{totalScenarios > 0 ? `${lastScore}%` : '—'}</div>
                <div className="stat-label">Dernier</div>
              </div>
            </div>

            <div className="chart-header">
              <span>Évolution des scores</span>
              {filteredHistory.length > 0 && (
                <span className="chart-count">
                  {filteredHistory.length} point{filteredHistory.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="chart-empty-state">
                <TrendingUp size={32} className="chart-empty-icon" aria-hidden="true" />
                <p>Aucune donnée de score</p>
                <span>Terminez un challenge pour visualiser votre courbe de progression.</span>
              </div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-blue)" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="var(--chart-blue)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickMargin={8} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow)',
                      }}
                      itemStyle={{ color: 'var(--text)' }}
                      labelStyle={{ color: 'var(--text-muted)', fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--chart-blue)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                      dot={{ r: 3, fill: 'var(--chart-blue)' }}
                      activeDot={{ r: 5, fill: 'var(--action-bg)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="auditor-rank-card">
              <div className="rank-header">
                <span className="rank-title">Rang d'auditeur</span>
                <span className="rank-badge">{rankInfo.title}</span>
              </div>
              <div className="rank-progress-bar">
                <div className="rank-progress-fill" style={{ width: `${rankInfo.progress}%` }} />
              </div>
              <p className="rank-desc">{rankInfo.desc}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}