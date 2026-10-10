import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  LogOut,
  Code2,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Activity,
  Award,
  BookOpen,
  X,
  Sun,
  Moon,
  Settings
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

import { authClient } from '../auth'
import FeedbackMessage from '../components/FeedbackMessage'
import { describeNetworkError } from '../network-error'
import { describePasswordPolicy, validatePassword } from '../password-policy'
import { applyTheme, readStoredTheme, type Theme } from '../theme'

// -- Mock Data --
const MOCK_HISTORY = [
  {
    id: "sc-1",
    title: "Faille XSS sur champ de recherche",
    language: "typescript",
    theme: "Sécurité",
    score: 85,
    date: "2026-10-01",
    code: "function Search() {\n  const query = getQuery();\n  document.getElementById('results').innerHTML = query;\n}",
    userAnswer: "Il ne faut pas utiliser innerHTML car cela permet d'injecter des scripts malveillants. Utiliser textContent à la place.",
    expectedAnswer: "L'utilisation de innerHTML avec des données non sanitizées expose à des attaques XSS. Il faut utiliser textContent ou sanitiser la chaîne."
  },
  {
    id: "sc-2",
    title: "Fuite de mémoire dans useEffect",
    language: "typescript",
    theme: "Performance",
    score: 95,
    date: "2026-10-03",
    code: "useEffect(() => {\n  const interval = setInterval(() => tick(), 1000);\n  // pas de cleanup\n}, []);",
    userAnswer: "Il manque le return () => clearInterval(interval); dans le useEffect.",
    expectedAnswer: "Le useEffect crée un intervalle mais ne le nettoie pas lors du démontage du composant, ce qui cause une fuite de mémoire. Il faut retourner une fonction de cleanup."
  },
  {
    id: "sc-3",
    title: "SQL Injection basique",
    language: "python",
    theme: "Sécurité",
    score: 60,
    date: "2026-10-05",
    code: "cursor.execute(f'SELECT * FROM users WHERE id = {user_id}')",
    userAnswer: "On doit utiliser des paramètres dans execute au lieu de f-strings.",
    expectedAnswer: "L'utilisation de f-strings pour construire une requête SQL permet des injections SQL. Il faut utiliser la paramétrisation native du connecteur (ex: execute('... %s', (user_id,)))."
  },
  {
    id: "sc-4",
    title: "Exposition de clé API",
    language: "go",
    theme: "Sécurité",
    score: 100,
    date: "2026-10-06",
    code: "const API_KEY = 'sk-live-123456789'\nfunc connect() {\n  client.Init(API_KEY)\n}",
    userAnswer: "La clé API est en dur dans le code. Il faut utiliser des variables d'environnement.",
    expectedAnswer: "Les secrets ne doivent jamais être hardcodés dans le code source. Il faut utiliser os.Getenv() ou un gestionnaire de configuration pour les injecter à l'exécution."
  }
];

export function translateAccountError(error: {
  code?: string
  message?: string
}): string {
  switch (error.code) {
    case 'INVALID_PASSWORD':
      return 'Le mot de passe actuel est incorrect.'
    case 'INVALID_EMAIL':
      return "L'adresse e-mail n'est pas valide."
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Cette adresse e-mail est déjà utilisée par un autre compte.'
    case 'PASSWORD_TOO_SHORT':
      return 'Le mot de passe doit contenir au moins 8 caractères.'
    case 'PASSWORD_TOO_LONG':
      return 'Le mot de passe est trop long.'
    case 'WEAK_PASSWORD':
      return error.message || describePasswordPolicy()
    default:
      return 'Une erreur est survenue. Vérifiez les informations saisies.'
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(MOCK_HISTORY[0].theme)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<Theme>(readStoredTheme)

  const [editingField, setEditingField] = useState<'name' | 'password' | null>(null)
  const [editName, setEditName] = useState('')
  const [editPassCurrent, setEditPassCurrent] = useState('')
  const [editPassNew, setEditPassNew] = useState('')
  const [editPassConfirm, setEditPassConfirm] = useState('')
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const themes = Array.from(new Set(MOCK_HISTORY.map(s => s.theme)))

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await authClient.signOut()
    await navigate('/login', { replace: true })
  }

  const handleThemeChange = (t: Theme) => {
    applyTheme(t)
    setCurrentTheme(t)
  }

  const openEdit = (field: 'name' | 'password') => {
    setEditError('')
    setEditName(session?.user?.name || '')
    setEditPassCurrent('')
    setEditPassNew('')
    setEditPassConfirm('')
    setEditingField(field)
  }

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setEditError("Le pseudo ne peut pas être vide.")
      return
    }
    setIsSaving(true)
    setEditError('')

    try {
      const { error } = await authClient.updateUser({ name: editName })
      if (error) setEditError(translateAccountError(error))
      else setEditingField(null)
    } catch (err: unknown) {
      setEditError(describeNetworkError(err) ?? 'Une erreur est survenue. Réessayez.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (!editPassCurrent || !editPassNew || !editPassConfirm) {
      setEditError("Veuillez remplir tous les champs.")
      return
    }
    if (editPassNew !== editPassConfirm) {
      setEditError("Les nouveaux mots de passe ne correspondent pas.")
      return
    }
    const policyError = validatePassword(editPassNew)
    if (policyError) {
      setEditError(policyError)
      return
    }
    setIsSaving(true)
    setEditError('')

    try {
      const { error } = await authClient.changePassword({
        newPassword: editPassNew,
        currentPassword: editPassCurrent,
        revokeOtherSessions: true,
      })
      if (error) setEditError(translateAccountError(error))
      else setEditingField(null)
    } catch (err: unknown) {
      setEditError(describeNetworkError(err) ?? 'Une erreur est survenue. Réessayez.')
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = session?.user?.name || session?.user?.email || 'Utilisateur'
  const initial = displayName.charAt(0).toUpperCase()

  const selectedScenario = MOCK_HISTORY.find(s => s.id === selectedScenarioId)

  const filteredHistory = expandedTheme
      ? MOCK_HISTORY.filter(s => s.theme === expandedTheme)
      : MOCK_HISTORY

  const chartData = [...filteredHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        name: new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        score: s.score
      }))

  const totalScenarios = filteredHistory.length
  const averageScore = totalScenarios > 0
      ? Math.round(filteredHistory.reduce((acc, curr) => acc + curr.score, 0) / totalScenarios)
      : 0

  return (
      <>
        <div className="dashboard-layout">

          {/* 1. Left Column: Scenarios List */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <BookOpen className="panel-title-icon" size={20} />
              Historique
            </div>

            <div className="scenario-list">
              {themes.map(theme => (
                  <div key={theme} className="theme-group">
                    <div
                        className={`theme-header${expandedTheme === theme ? ' active' : ''}`}
                        onClick={() => setExpandedTheme(expandedTheme === theme ? null : theme)}
                    >
                      {theme === 'Sécurité' ? <ShieldAlert size={16} /> : <Zap size={16} />}
                      {theme}
                    </div>

                    {expandedTheme === theme && (
                        <div className="theme-scenarios" style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                          {MOCK_HISTORY.filter(s => s.theme === theme).map((scenario) => (
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
                          <Code2 size={12} /> {scenario.language}
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

          {/* 2. Middle Column: Scenario Details */}
          <div className="dashboard-panel">
            <div className="panel-title">
              <Activity className="panel-title-icon" size={20} />
              Détails du Scénario
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
                        <Code2 size={16} /> Code Source
                      </div>
                      <pre className="detail-content code">
                  {selectedScenario.code}
                </pre>
                    </div>

                    <div className="detail-section user-answer">
                      <div className="detail-header accent">Votre Réponse</div>
                      <div className="detail-content">
                        {selectedScenario.userAnswer}
                      </div>
                    </div>

                    <div className="detail-section correct-answer">
                      <div className="detail-header success">
                        <CheckCircle2 size={16} /> Solution Attendue
                      </div>
                      <div className="detail-content">
                        {selectedScenario.expectedAnswer}
                      </div>
                    </div>
                  </>
              ) : (
                  <div className="empty-state">
                    <BookOpen size={48} className="empty-icon" />
                    <p>Sélectionnez un scénario à gauche pour voir les détails.</p>
                  </div>
              )}
            </div>
          </div>

          {/* 3. Right Column: Progress & Profile */}
          <div className="dashboard-panel">
            <div className="profile-bar">
              <div className="profile-summary">
                <div className="user-avatar">{initial}</div>
                <span className="profile-name">{displayName}</span>
              </div>

              <button
                  className="btn-icon"
                  onClick={() => setIsProfileModalOpen(true)}
                  title="Paramètres du compte"
              >
                <Settings size={18} />
              </button>
              <button
                  className="btn-icon btn-icon-logout"
                  onClick={handleLogout}
                  title="Se déconnecter"
              >
                <LogOut size={18} />
              </button>
            </div>

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

          {/* Profile & Settings Modal */}
          {isProfileModalOpen && (
              <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Paramètres du Compte</h3>
                    <button className="btn-close" onClick={() => setIsProfileModalOpen(false)}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-feedback" data-visible={Boolean(editError)}>
                      <div>
                        {editError && (
                            <FeedbackMessage kind="error">{editError}</FeedbackMessage>
                        )}
                      </div>
                    </div>

                    {/* Theme Preference */}
                    <div className="setting-row">
                      <div className="setting-info">
                        <label>Thème de l'interface</label>
                        <span>{currentTheme === 'dark' ? 'Sombre' : 'Clair'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            className={`btn-icon ${currentTheme === 'light' ? 'active' : ''}`}
                            onClick={() => handleThemeChange('light')}
                            title="Thème clair"
                            style={{
                              border: currentTheme === 'light' ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                              padding: '0.4rem',
                              borderRadius: '6px'
                            }}
                        >
                          <Sun size={18} />
                        </button>
                        <button
                            className={`btn-icon ${currentTheme === 'dark' ? 'active' : ''}`}
                            onClick={() => handleThemeChange('dark')}
                            title="Thème sombre"
                            style={{
                              border: currentTheme === 'dark' ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                              padding: '0.4rem',
                              borderRadius: '6px'
                            }}
                        >
                          <Moon size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Email (Lecture seule) */}
                    <div className="setting-row">
                      <div className="setting-info">
                        <label>Email</label>
                        <span>{session?.user?.email}</span>
                      </div>
                    </div>{/* Pseudo */}
                    <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="setting-info" style={{ flex: 1 }}>
                        <label>Pseudo</label>
                        {editingField !== 'name' && <span>{displayName}</span>}
                        {editingField === 'name' && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <input
                                  type="text"
                                  className="form-control"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  autoFocus
                                  placeholder="Nouveau pseudo"
                                  disabled={isSaving}
                              />
                            </div>
                        )}
                      </div>
                      {editingField === 'name' ? (
                          <div className="setting-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', height: 'fit-content' }}>
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => setEditingField(null)}
                                disabled={isSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', height: '36px', margin: 0 }}
                            >
                              Annuler
                            </button>
                            <button
                                type="button"
                                className="btn-primary-sm"
                                onClick={handleSaveName}
                                disabled={isSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', margin: 0 }}
                            >
                              {isSaving ? 'En cours...' : 'Enregistrer'}
                            </button>
                          </div>
                      ) : (
                          <button
                              type="button"
                              className="btn-text"
                              onClick={() => openEdit('name')}
                              style={{ display: 'inline-flex', alignItems: 'center', height: '36px' }}
                          >
                            Modifier
                          </button>
                      )}
                    </div>{/* Mot de passe */}
                    <div className="setting-row" style={{ display: 'flex', alignItems: editingField === 'password' ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
                      <div className="setting-info" style={{ flex: 1 }}>
                        <label>Mot de passe</label>
                        {editingField !== 'password' && <span>••••••••</span>}
                        {editingField === 'password' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <input type="password" className="form-control" value={editPassCurrent} onChange={e => setEditPassCurrent(e.target.value)} placeholder="Mot de passe actuel" autoFocus disabled={isSaving} />
                              <input type="password" className="form-control" value={editPassNew} onChange={e => setEditPassNew(e.target.value)} placeholder="Nouveau mot de passe" disabled={isSaving} />
                              <small className="form-hint">{describePasswordPolicy()}</small>
                              <input type="password" className="form-control" value={editPassConfirm} onChange={e => setEditPassConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" disabled={isSaving} />
                            </div>
                        )}
                      </div>
                      {editingField === 'password' ? (
                          <div className="setting-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', alignSelf: 'flex-end', marginTop: 'auto' }}>
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => setEditingField(null)}
                                disabled={isSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', height: '36px', margin: 0 }}
                            >
                              Annuler
                            </button>
                            <button
                                type="button"
                                className="btn-primary-sm"
                                onClick={handleSavePassword}
                                disabled={isSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', margin: 0 }}
                            >
                              {isSaving ? 'En cours...' : 'Enregistrer'}
                            </button>
                          </div>
                      ) : (
                          <button
                              type="button"
                              className="btn-text"
                              onClick={() => openEdit('password')}
                              style={{ display: 'inline-flex', alignItems: 'center', height: '36px' }}
                          >
                            Modifier
                          </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

        </div>
      </>
  )
}