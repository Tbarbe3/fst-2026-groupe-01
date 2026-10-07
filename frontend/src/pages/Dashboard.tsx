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
  Palette
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
import { applyTheme, readStoredTheme, type Theme } from '../theme'
import './Dashboard.css'

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

// Les données du graphique sont maintenant calculées dynamiquement.
// ---------------

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(MOCK_HISTORY[0].theme)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<Theme>(readStoredTheme)

  const [editingField, setEditingField] = useState<'name' | 'email' | 'password' | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
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
    setIsThemeModalOpen(false)
  }

  const openEdit = (field: 'name' | 'email' | 'password') => {
    setEditError('')
    setEditName(session?.user?.name || '')
    setEditEmail(session?.user?.email || '')
    setEditPassCurrent('')
    setEditPassNew('')
    setEditPassConfirm('')
    setEditingField(field)
  }

  const translateError = (message?: string) => {
    if (!message) return 'Une erreur inattendue est survenue.'
    const msg = message.toLowerCase()
    if (msg.includes('invalid password') || msg.includes('incorrect')) return 'Le mot de passe actuel est incorrect.'
    if (msg.includes('invalid email')) return "L'adresse e-mail est invalide."
    if (msg.includes('already exists') || msg.includes('taken')) return 'Cette adresse e-mail est déjà utilisée.'
    if (msg.includes('short')) return 'Le mot de passe est trop court (8 caractères minimum).'
    return 'Une erreur est survenue : ' + message
  }

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setEditError("Le pseudo ne peut pas être vide.")
      return
    }
    setIsSaving(true)
    setEditError('')

    const { error } = await authClient.updateUser({ name: editName })
    setIsSaving(false)
    if (error) setEditError(translateError(error.message))
    else setEditingField(null)
  }

  const handleSaveEmail = async () => {
    if (!editEmail.trim()) {
      setEditError("L'e-mail ne peut pas être vide.")
      return
    }
    setIsSaving(true)
    setEditError('')

    const { error } = await authClient.changeEmail({ newEmail: editEmail })
    setIsSaving(false)
    if (error) setEditError(translateError(error.message))
    else setEditingField(null)
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
    setIsSaving(true)
    setEditError('')
    const { error } = await authClient.changePassword({
      newPassword: editPassNew,
      currentPassword: editPassCurrent,
      revokeOtherSessions: true
    })
    setIsSaving(false)
    if (error) setEditError(translateError(error.message))
    else setEditingField(null)
  }

  const displayName = session?.user?.name || session?.user?.email || 'Utilisateur'
  const initial = displayName.charAt(0).toUpperCase()
  
  const selectedScenario = MOCK_HISTORY.find(s => s.id === selectedScenarioId)

  // Calcul dynamique des données du graphique selon le thème sélectionné
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
                className="theme-header"
                onClick={() => setExpandedTheme(expandedTheme === theme ? null : theme)}
                style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  color: expandedTheme === theme ? 'var(--accent)' : '#fff',
                  border: expandedTheme === theme ? '1px solid var(--border)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
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
                  <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>Score d'évaluation</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ce score reflète la précision de votre analyse.
                  </p>
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
                <div className="detail-header" style={{ color: 'var(--accent)' }}>
                  Votre Réponse
                </div>
                <div className="detail-content">
                  {selectedScenario.userAnswer}
                </div>
              </div>

              <div className="detail-section correct-answer">
                <div className="detail-header" style={{ color: '#34d399' }}>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', background: 'var(--surface-sunken)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div 
              onClick={() => setIsProfileModalOpen(true)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: 'auto', cursor: 'pointer' }}
              title="Modifier le profil"
            >
              <div className="user-avatar">{initial}</div>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }} className="hover-underline">{displayName}</span>
            </div>
            
            <button className="btn-icon" onClick={() => setIsThemeModalOpen(true)} title="Changer le thème" style={{ padding: '0.5rem', background: 'rgba(128,128,128,0.1)', borderRadius: '8px' }}>
              <Palette size={18} />
            </button>
            <button className="btn-icon" onClick={handleLogout} title="Se déconnecter" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickMargin={10} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
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
      
      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsThemeModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '300px' }}>
            <div className="modal-header">
              <h3>Thème</h3>
              <button className="btn-close" onClick={() => setIsThemeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => handleThemeChange('light')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem', borderRadius: '8px', border: currentTheme === 'light' ? '2px solid var(--accent)' : '2px solid var(--border)',
                  background: 'rgba(255,255,255,0.05)', cursor: 'pointer', flex: 1
                }}
              >
                <Sun size={24} />
                <span>Clair</span>
              </button>
              <button 
                onClick={() => handleThemeChange('dark')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem', borderRadius: '8px', border: currentTheme === 'dark' ? '2px solid var(--accent)' : '2px solid var(--border)',
                  background: 'rgba(255,255,255,0.05)', cursor: 'pointer', flex: 1
                }}
              >
                <Moon size={24} />
                <span>Sombre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Paramètres du Profil</h3>
              <button className="btn-close" onClick={() => setIsProfileModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {editError && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{editError}</div>}
              
              {/* Name */}
              <div className="setting-row">
                <div className="setting-info">
                  <label>Pseudo</label>
                  {editingField !== 'name' && <span>{displayName}</span>}
                  {editingField === 'name' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input type="text" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} autoFocus placeholder="Nouveau pseudo" disabled={isSaving} />
                    </div>
                  )}
                </div>
                {editingField === 'name' ? (
                  <div className="setting-actions">
                    <button className="btn-text" onClick={() => setEditingField(null)} disabled={isSaving}>Annuler</button>
                    <button className="btn-primary-sm" onClick={handleSaveName} disabled={isSaving}>
                      {isSaving ? 'En cours...' : 'Enregistrer'}
                    </button>
                  </div>
                ) : (
                  <button className="btn-text" onClick={() => openEdit('name')}>Modifier</button>
                )}
              </div>

              {/* Email */}
              <div className="setting-row">
                <div className="setting-info">
                  <label>Email</label>
                  {editingField !== 'email' && <span>{session?.user?.email}</span>}
                  {editingField === 'email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input type="email" className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} autoFocus placeholder="Nouvel email" disabled={isSaving} />
                    </div>
                  )}
                </div>
                {editingField === 'email' ? (
                  <div className="setting-actions">
                    <button className="btn-text" onClick={() => setEditingField(null)} disabled={isSaving}>Annuler</button>
                    <button className="btn-primary-sm" onClick={handleSaveEmail} disabled={isSaving}>
                      {isSaving ? 'En cours...' : 'Enregistrer'}
                    </button>
                  </div>
                ) : (
                  <button className="btn-text" onClick={() => openEdit('email')}>Modifier</button>
                )}
              </div>

              {/* Password */}
              <div className="setting-row">
                <div className="setting-info">
                  <label>Mot de passe</label>
                  {editingField !== 'password' && <span>••••••••</span>}
                  {editingField === 'password' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input type="password" className="form-control" value={editPassCurrent} onChange={e => setEditPassCurrent(e.target.value)} placeholder="Mot de passe actuel" autoFocus disabled={isSaving} />
                      <input type="password" className="form-control" value={editPassNew} onChange={e => setEditPassNew(e.target.value)} placeholder="Nouveau mot de passe" disabled={isSaving} />
                      <input type="password" className="form-control" value={editPassConfirm} onChange={e => setEditPassConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" disabled={isSaving} />
                    </div>
                  )}
                </div>
                {editingField === 'password' ? (
                  <div className="setting-actions">
                    <button className="btn-text" onClick={() => setEditingField(null)} disabled={isSaving}>Annuler</button>
                    <button className="btn-primary-sm" onClick={handleSavePassword} disabled={isSaving}>
                      {isSaving ? 'En cours...' : 'Enregistrer'}
                    </button>
                  </div>
                ) : (
                  <button className="btn-text" onClick={() => openEdit('password')}>Modifier</button>
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
