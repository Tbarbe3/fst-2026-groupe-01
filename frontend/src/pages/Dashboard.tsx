import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
    Code2,
    ShieldAlert,
    Zap,
    CheckCircle2,
    Activity,
    Award,
    BookOpen
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

import { challengesApi, type AttemptSummary } from '../api/challenges'
import ChallengeLauncher from '../components/ChallengeLauncher'
import FeedbackMessage from '../components/FeedbackMessage'
import LoadingScreen from '../components/LoadingScreen'
import { describeNetworkError } from '../errors/network-error'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS, label } from '../labels'

export default function Dashboard() {
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
    const themes = Array.from(new Set(allHistory.map(s => s.category)))



    const selectedScenario = allHistory.find(s => s.id === selectedScenarioId)

    const filteredHistory = expandedTheme
        ? allHistory.filter(s => s.category === expandedTheme)
        : allHistory

    const chartData = [...filteredHistory]
        .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
        .map(s => ({
            name: new Date(s.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            score: s.score
        }))

    const totalScenarios = filteredHistory.length
    const averageScore = totalScenarios > 0
        ? Math.round(filteredHistory.reduce((acc, curr) => acc + curr.score, 0) / totalScenarios)
        : 0


    return (
        <>
            <div className="dashboard-layout">
                {/* 1. Colonne gauche : Historique */}
                <div className="dashboard-panel">
                    <div className="panel-title">
                        <BookOpen className="panel-title-icon" size={20} />
                        Historique
                    </div>

                    <button
                        type="button"
                        className="btn-primary-sm new-challenge-btn"
                        onClick={() => setSelectedScenarioId(null)}
                    >
                        <Zap size={14} aria-hidden="true" /> Nouveau challenge
                    </button>

                    <div className="scenario-list">
                        {history === null && !historyError && <LoadingScreen label="Chargement de l'historique…" />}
                        {historyError && <FeedbackMessage kind="error">{historyError}</FeedbackMessage>}
                        {history?.length === 0 && (
                            <p className="empty-history">Aucune revue terminée pour l'instant.</p>
                        )}
                        {themes.map(theme => (
                            <div key={theme} className="theme-group">
                                <div
                                    className={`theme-header${expandedTheme === theme ? ' active' : ''}`}
                                    onClick={() => setExpandedTheme(expandedTheme === theme ? null : theme)}
                                >
                                    {theme === 'security_owasp' ? <ShieldAlert size={16} /> : <Zap size={16} />}
                                    {label(CATEGORY_LABELS, theme)}
                                </div>

                                {expandedTheme === theme && (
                                    <div className="theme-scenarios" style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {allHistory.filter(s => s.category === theme).map((scenario) => (
                                            <div
                                                key={scenario.id}
                                                className={`scenario-item ${selectedScenarioId === scenario.id ? 'active' : ''}`}
                                                onClick={() => setSelectedScenarioId(scenario.id)}
                                            >
                                                <div className="scenario-header">
                                                    <div className="scenario-title">{scenario.title}</div>
                                                    <div className={`scenario-score ${scenario.score >= 80 ? '' : scenario.score >= 60 ? 'medium' : 'low'}`}>
                                                        {scenario.score}%
                                                    </div>
                                                </div>
                                                <div className="scenario-meta">
                          <span className="meta-tag">
                            <Code2 size={12} /> {label(LANGUAGE_LABELS, scenario.language)}
                          </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Colonne centrale : Détails du Scénario */}
                <div className="dashboard-panel">
                    <div className="panel-title">
                        <Activity className="panel-title-icon" size={20} />
                        {selectedScenario ? 'Détails du Scénario' : 'Nouveau challenge'}
                    </div>

                    <div className="scenario-details">
                        {selectedScenario ? (
                            <>
                                <div className="score-display">
                                    <div className="score-circle">
                                        {selectedScenario.score}
                                    </div>
                                    <div>
                                        <h3>Score d'évaluation</h3>
                                        <p>Ce score reflète la précision de votre analyse.</p>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <div className="detail-header">
                                        <Code2 size={16} /> {selectedScenario.title}
                                    </div>
                                    <div className="detail-content">
                                        {label(LANGUAGE_LABELS, selectedScenario.language)} · {label(DIFFICULTY_LABELS, selectedScenario.difficulty)} · {label(CATEGORY_LABELS, selectedScenario.category)}
                                        <br />
                                        Terminé le {new Date(selectedScenario.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>

                                <Link to={`/review/${selectedScenario.id}/result`} className="btn btn-primary review-link-btn">
                                    <CheckCircle2 size={16} aria-hidden="true" /> Voir le débriefing complet
                                </Link>
                            </>
                        ) : (
                            <ChallengeLauncher />
                        )}
                    </div>
                </div>

                {/* 3. Colonne droite : Progression */}
                <div className="dashboard-panel">

                    <div className="panel-title">
                        <Award className="panel-title-icon" size={20} />
                        Progression
                    </div>

                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--chart-blue)" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="var(--chart-blue)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--surface)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                    }}
                                    itemStyle={{ color: 'var(--text)' }}
                                    labelStyle={{ color: 'var(--text-muted)' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="var(--chart-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{totalScenarios}</div>
                            <div className="stat-label">Scénarios</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{averageScore}%</div>
                            <div className="stat-label">Moyenne</div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}