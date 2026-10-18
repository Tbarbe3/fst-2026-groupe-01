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
                                <span className="user-chip-name">{displayName}</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => handleLogout(e)}
                                className="btn-icon-nav"
                                title="Se déconnecter"
                                aria-label="Se déconnecter"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="landing-main">
                {/* Titre du tableau de bord */}
                <section className="dashboard-hero-section" aria-labelledby="dashboard-title">
                    <div className="dashboard-hero-container">
                        <div className="hero-welcome-badge" role="status">
                            <LayoutDashboard size={16} />
                            <span>
                                Tableau de bord de <strong className="welcome-pseudo">{displayName}</strong>
                            </span>
                        </div>
                        <h1 id="dashboard-title" className="hero-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                            Votre espace personnel
                            <span className="hero-title-highlight"> de progression.</span>
                        </h1>
                    </div>
                </section>

                {/* Contenu principal du tableau de bord */}
                <section className="dashboard-content-section" id="historique">
                    <div className="dashboard-grid">
                        {/* 1. Colonne gauche : Historique */}
                        <div className="dashboard-panel">
                            <div className="panel-title">
                                <BookOpen className="panel-title-icon" size={20} />
                                Historique
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

                    <div className="footer-links-col">
                        <div className="footer-links-title">Plateforme</div>
                        <ul className="footer-links-list">
                            <li>
                                <Link to="/">Accueil</Link>
                            </li>
                            <li>
                                <a href="#historique">Historique</a>
                            </li>
                            <li>
                                <a href="#progression">Progression</a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-links-col">
                        <div className="footer-links-title">Compte & Accès</div>
                        <ul className="footer-links-list">
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setIsProfileModalOpen(true)}
                                    className="footer-btn-link"
                                >
                                    Paramètres du compte
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    onClick={(e) => handleLogout(e)}
                                    className="footer-btn-link"
                                >
                                    Se déconnecter
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-links-col">
                        <div className="footer-links-title">Qualité & Normes</div>
                        <p className="footer-note">
                            Interface accessible conforme WCAG AA avec contrastes vérifiés et navigation clavier complète.
                        </p>
                    </div>
                </div>

            </div>
        </>
    )
}