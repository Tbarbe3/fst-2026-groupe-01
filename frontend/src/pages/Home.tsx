import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import {
  Code2,
  Terminal,
  ShieldAlert,
  Zap,
  CheckCircle2,
  ArrowRight,
  GitPullRequest,
  Bug,
  Award,
  Sparkles,
  Layers,
  LayoutDashboard,
  LogIn,
  UserPlus,
  ChevronRight,
  Flame,
} from 'lucide-react'

import { authClient } from '../auth'
import DiffViewer from '../components/DiffViewer'
import { scrollToSection } from '../hooks/useSectionHref'
import { getDemoScenarios, getSupportedLanguages, useI18n } from '../i18n'

export default function Home() {
  const { locale, t } = useI18n()
  const location = useLocation()
  const { data: session } = authClient.useSession()
  const isAuthenticated = Boolean(session?.user)
  const displayName = session?.user?.name || session?.user?.email || 'Développeur'

  const [activeTabId, setActiveTabId] = useState<string>('typescript')
  const [viewMode, setViewMode] = useState<'anomaly' | 'solution'>('anomaly')

  const demoScenarios = getDemoScenarios(locale)
  const supportedLanguages = getSupportedLanguages(locale)

  const currentScenario =
    demoScenarios.find((s) => s.id === activeTabId) || demoScenarios[0]

  useEffect(() => {
    if (location.hash) {
      let attempts = 0
      const tryScroll = () => {
        scrollToSection(location.hash)
        attempts++
        if (attempts < 3) {
          setTimeout(tryScroll, 120)
        }
      }
      const timer = setTimeout(tryScroll, 50)
      return () => clearTimeout(timer)
    }
  }, [location.hash, location.pathname])

  return (
    <div className="landing-content">
      <div className="landing-main">
        {/* 2. Hero Section */}
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-container">
            {isAuthenticated ? (
              <div className="hero-welcome-badge" role="status">
                <span className="welcome-emoji" aria-hidden="true">👋</span>
                <span>
                  {locale === 'fr' ? (
                    <>
                      Bonjour <strong className="welcome-pseudo">{displayName}</strong> ! Prêt pour une nouvelle revue de code ?
                    </>
                  ) : (
                    <>
                      Welcome back <strong className="welcome-pseudo">{displayName}</strong>! Ready for a new code review?
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="hero-badge">
                <Sparkles size={14} className="hero-badge-icon" />
                <span>{t('home.taglineBadge')}</span>
              </div>
            )}

            <h1 id="hero-title" className="hero-title">
              {t('home.heroTitle')}
              <span className="hero-title-highlight">{t('home.heroTitleHighlight')}</span>
            </h1>

            <p className="hero-description">{t('home.heroDesc')}</p>

            <div className="hero-cta-group">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="hero-btn-primary">
                    <LayoutDashboard size={18} />
                    <span>{t('home.myDashboard', { name: displayName })}</span>
                    <ArrowRight size={18} />
                  </Link>
                  <a href="#demo" className="hero-btn-secondary">
                    <span>{t('home.exploreDemo')}</span>
                  </a>
                </>
              ) : (
                <>
                  <Link to="/register" className="hero-btn-primary">
                    <UserPlus size={18} />
                    <span>{t('home.createFreeAccount')}</span>
                    <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="hero-btn-secondary">
                    <LogIn size={18} />
                    <span>{t('home.signIn')}</span>
                  </Link>
                </>
              )}
            </div>

            {/* Statistiques / Preuves de valeur */}
            <div className="hero-metrics" role="region" aria-label={t('home.metricsAria')}>
              <div className="metric-item">
                <div className="metric-value">7+</div>
                <div className="metric-label">{t('home.metricLanguages')}</div>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <div className="metric-value">{t('home.metricLevels')}</div>
                <div className="metric-label">{t('home.metricLevelsSub')}</div>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <div className="metric-value">100%</div>
                <div className="metric-label">{t('home.metricPr')}</div>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <div className="metric-value">OWASP & Perf</div>
                <div className="metric-label">{t('home.metricOwasp')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section Le Code en direct (Interactive PR Review Showcase) */}
        <section id="demo" className="demo-section" aria-labelledby="demo-title">
          <div className="section-header">
            <div className="section-pill">
              <GitPullRequest size={14} />
              <span>{t('home.demoPill')}</span>
            </div>
            <h2 id="demo-title" className="section-title">
              {t('home.demoTitle')}
            </h2>
            <p className="section-subtitle">{t('home.demoSubtitle')}</p>
          </div>

          <div className="demo-workspace">
            {/* Sélecteur de langage / scénario */}
            <div className="demo-language-tabs" role="tablist" aria-label={t('home.demoTabsAria')}>
              {demoScenarios.map((scenario) => {
                const isActive = scenario.id === activeTabId
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    role="tab"
                    id={`tab-${scenario.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${scenario.id}`}
                    className={`lang-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTabId(scenario.id)
                      setViewMode('anomaly')
                    }}
                  >
                    <span
                      className="lang-dot"
                      style={{ backgroundColor: scenario.color }}
                    />
                    <span>{scenario.languageLabel}</span>
                  </button>
                )
              })}
            </div>

            {/* Fenêtre de la Pull Request */}
            <div
              className="pr-card"
              role="tabpanel"
              id={`panel-${currentScenario.id}`}
              aria-labelledby={`tab-${currentScenario.id}`}
            >
              {/* En-tête de la Pull Request */}
              <div className="pr-header">
                <div className="pr-header-top">
                  <div className="pr-title-group">
                    <span className="pr-status-badge">
                      <GitPullRequest size={14} /> {t('home.prOpen')}
                    </span>
                    <h3 className="pr-title">{currentScenario.title}</h3>
                  </div>

                  <div className="pr-mode-toggle">
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === 'anomaly' ? 'active' : ''}`}
                      onClick={() => setViewMode('anomaly')}
                    >
                      <Bug size={14} />
                      <span>{t('home.modeAnomaly')}</span>
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === 'solution' ? 'active' : ''}`}
                      onClick={() => setViewMode('solution')}
                    >
                      <CheckCircle2 size={14} />
                      <span>{t('home.modeSolution')}</span>
                    </button>
                  </div>
                </div>

                <div className="pr-meta-row">
                  <div className="pr-author">
                    <span className="author-label">{t('home.author')}</span>
                    <span className="author-name">{currentScenario.persona.name}</span>
                    <span className="author-tag">({currentScenario.persona.tag})</span>
                  </div>

                  <div className="pr-tags">
                    <span className="pr-category-tag">
                      <ShieldAlert size={12} /> {currentScenario.category}
                    </span>
                    <span className={`pr-severity-tag severity-${currentScenario.severity.toLowerCase()}`}>
                      {currentScenario.severity}
                    </span>
                  </div>
                </div>

                {/* Ticket Jira / Contexte fonctionnel */}
                <div className="pr-ticket-box">
                  <div className="ticket-label">
                    <Terminal size={13} />
                    <span>{t('home.ticketContext')}</span>
                  </div>
                  <p className="ticket-text">{currentScenario.ticket}</p>
                </div>
              </div>

              {/* Fichier et Diff Viewer */}
              <DiffViewer
                filename={currentScenario.filename}
                lines={
                  viewMode === 'anomaly'
                    ? currentScenario.diff
                    : currentScenario.fixedDiff.map((line) => ({ ...line, isVulnerable: false }))
                }
              >
                {/* Annotation & Commentaire de revue inline */}
                {viewMode === 'anomaly' && (
                  <div className="inline-review-box">
                    <div className="review-comment-card">
                      <div className="comment-header">
                        <div className="comment-author-info">
                          <div className="comment-avatar">
                            {currentScenario.comment.avatarInitial}
                          </div>
                          <div>
                            <div className="comment-author-name">
                              {currentScenario.comment.author}
                              <span className="comment-author-role">
                                {currentScenario.comment.role}
                              </span>
                            </div>
                            <div className="comment-vuln-type">
                              <ShieldAlert size={13} />
                              <span>{currentScenario.comment.type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="comment-score-badge">
                          <Award size={14} />
                          <span>+{currentScenario.comment.score} pts</span>
                        </div>
                      </div>

                      <div className="comment-body">
                        <p>{currentScenario.comment.text}</p>
                      </div>

                      <div className="comment-footer">
                        <span className="comment-status">
                          <CheckCircle2 size={14} className="icon-success" />
                          <span>{t('home.judgeApproved')}</span>
                        </span>
                        <button
                          type="button"
                          className="btn-switch-solution"
                          onClick={() => setViewMode('solution')}
                        >
                          <span>{t('home.viewSolution')}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </DiffViewer>
            </div>
          </div>
        </section>

        {/* 4. Section Langages & Catégories de Failles */}
        <section id="languages" className="languages-section" aria-labelledby="languages-title">
          <div className="section-header">
            <div className="section-pill">
              <Layers size={14} />
              <span>{t('home.languagesPill')}</span>
            </div>
            <h2 id="languages-title" className="section-title">
              {t('home.languagesTitle')}
            </h2>
            <p className="section-subtitle">{t('home.languagesSubtitle')}</p>
          </div>

          <div className="languages-grid">
            {supportedLanguages.map((lang) => (
              <div key={lang.name} className="language-card">
                <div className="lang-card-header">
                  <div className="lang-badge-icon" style={{ borderColor: lang.color }}>
                    <Code2 size={18} style={{ color: lang.color }} />
                  </div>
                  <div>
                    <h3 className="lang-name">{lang.name}</h3>
                    <span className="lang-subtitle">{lang.tag}</span>
                  </div>
                  <span className="lang-level-pill">{lang.level}</span>
                </div>

                <div className="lang-card-body">
                  <div className="flaw-label">{t('home.targetedFlaws')}</div>
                  <p className="flaw-desc">{lang.flaws}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Carte vedette : Mode Mystère */}
          <div className="mystery-mode-banner">
            <div className="mystery-icon-box">
              <Flame size={28} className="mystery-icon" />
            </div>
            <div className="mystery-content">
              <div className="mystery-badge">{t('home.mysteryBadge')}</div>
              <h3 className="mystery-title">{t('home.mysteryTitle')}</h3>
              <p className="mystery-desc">{t('home.mysteryDesc')}</p>
            </div>
            <div className="mystery-action">
              <Link to="/dashboard" className="mystery-btn">
                <span>{t('home.mysteryBtn')}</span>
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* 5. Section Workflow en 4 étapes */}
        <section id="workflow" className="workflow-section" aria-labelledby="workflow-title">
          <div className="section-header">
            <div className="section-pill">
              <Zap size={14} />
              <span>{t('home.workflowPill')}</span>
            </div>
            <h2 id="workflow-title" className="section-title">
              {t('home.workflowTitle')}
            </h2>
            <p className="section-subtitle">{t('home.workflowSubtitle')}</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">{t('home.step1Title')}</h3>
              <p className="step-desc">{t('home.step1Desc')}</p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">{t('home.step2Title')}</h3>
              <p className="step-desc">{t('home.step2Desc')}</p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">{t('home.step3Title')}</h3>
              <p className="step-desc">{t('home.step3Desc')}</p>
            </div>

            <div className="step-card">
              <div className="step-number">04</div>
              <h3 className="step-title">{t('home.step4Title')}</h3>
              <p className="step-desc">{t('home.step4Desc')}</p>
            </div>
          </div>
        </section>

        {/* 6. Section Tableau de Bord & Progression */}
        <section id="progression" className="dashboard-preview-section" aria-labelledby="progression-title">
          <div className="progression-card">
            <div className="progression-content">
              <div className="section-pill">
                <Award size={14} />
                <span>{t('home.progressionPill')}</span>
              </div>
              <h2 id="progression-title" className="section-title text-left">
                {t('home.progressionTitle')}
              </h2>
              <p className="progression-desc">{t('home.progressionDesc')}</p>

              <div className="progression-features">
                <div className="p-feature">
                  <CheckCircle2 size={16} className="icon-success" />
                  <span>{t('home.pFeature1')}</span>
                </div>
                <div className="p-feature">
                  <CheckCircle2 size={16} className="icon-success" />
                  <span>{t('home.pFeature2')}</span>
                </div>
                <div className="p-feature">
                  <CheckCircle2 size={16} className="icon-success" />
                  <span>{t('home.pFeature3')}</span>
                </div>
              </div>

              <div className="progression-actions">
                <Link to="/dashboard" className="btn-dashboard-main">
                  <LayoutDashboard size={18} />
                  <span>{t('home.openDashboard')}</span>
                  <ArrowRight size={18} />
                </Link>
                {!isAuthenticated && (
                  <Link to="/register" className="btn-dashboard-sub">
                    <span>{t('home.createAccountSave')}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="progression-visual">
              <div className="fake-chart-card">
                <div className="fake-chart-header">
                  <div className="fake-dot red" />
                  <div className="fake-dot yellow" />
                  <div className="fake-dot green" />
                  <span className="fake-title">{t('home.chartTitle')}</span>
                </div>
                <div className="fake-stat-row">
                  <div className="fake-stat">
                    <span className="fake-stat-num">85%</span>
                    <span className="fake-stat-lbl">{t('home.chartAvg')}</span>
                  </div>
                  <div className="fake-stat">
                    <span className="fake-stat-num">12</span>
                    <span className="fake-stat-lbl">{t('home.chartAudits')}</span>
                  </div>
                  <div className="fake-stat">
                    <span className="fake-stat-num">Top 15%</span>
                    <span className="fake-stat-lbl">{t('home.chartConsistency')}</span>
                  </div>
                </div>
                <div className="fake-bars">
                  <div className="bar-col" style={{ height: '40%' }}>
                    <span>60%</span>
                  </div>
                  <div className="bar-col" style={{ height: '65%' }}>
                    <span>75%</span>
                  </div>
                  <div className="bar-col" style={{ height: '55%' }}>
                    <span>70%</span>
                  </div>
                  <div className="bar-col" style={{ height: '85%' }}>
                    <span>85%</span>
                  </div>
                  <div className="bar-col active-bar" style={{ height: '98%' }}>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Section Call to Action (CTA final) */}
        <section className="cta-banner-section" aria-labelledby="cta-banner-title">
          <div className="cta-banner-card">
            <h2 id="cta-banner-title" className="cta-banner-title">
              {t('home.ctaTitle')}
            </h2>
            <p className="cta-banner-text">{t('home.ctaDesc')}</p>

            <div className="cta-banner-buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="hero-btn-primary">
                  <LayoutDashboard size={18} />
                  <span>{t('home.myDashboard', { name: displayName })}</span>
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="hero-btn-primary">
                    <UserPlus size={18} />
                    <span>{t('home.createFreeAccount')}</span>
                    <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="hero-btn-secondary">
                    <LogIn size={18} />
                    <span>{t('home.signIn')}</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
