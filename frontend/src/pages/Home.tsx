import { useState } from 'react'
import { Link } from 'react-router'
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
import DiffViewer, { type DiffLine } from '../components/DiffViewer'

interface DemoScenario {
  id: string
  language: string
  languageLabel: string
  color: string
  title: string
  ticket: string
  persona: { name: string; tag: string }
  category: string
  severity: 'Critique' | 'Élevée' | 'Moyenne'
  filename: string
  diff: DiffLine[]
  fixedDiff: DiffLine[]
  comment: {
    author: string
    role: string
    avatarInitial: string
    type: string
    text: string
    score: number
  }
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'typescript',
    language: 'typescript',
    languageLabel: 'TypeScript',
    color: '#3178c6',
    title: 'PR #108 : Rendu dynamique des résultats de recherche',
    ticket:
      '[JIRA-382] Afficher dynamiquement les résultats de recherche tapés par l’utilisateur sans rechargement de page.',
    persona: { name: 'Kevin', tag: 'Junior pressé (fait confiance à Copilot)' },
    category: 'Sécurité OWASP (XSS)',
    severity: 'Critique',
    filename: 'src/components/SearchBox.tsx',
    diff: [
      { oldLineNumber: 14, newLineNumber: 14, type: 'context', code: 'export function renderSearchResults(query: string) {' },
      { oldLineNumber: 15, newLineNumber: 15, type: 'context', code: '  const container = document.getElementById("search-output");' },
      { oldLineNumber: 16, newLineNumber: 16, type: 'context', code: '  if (!container) return;' },
      { oldLineNumber: 17, type: 'delete', code: '-  container.textContent = "Recherche en cours...";' },
      { newLineNumber: 17, type: 'add', isVulnerable: true, code: '+  // Injection directe de l’entrée utilisateur dans le DOM' },
      { newLineNumber: 18, type: 'add', isVulnerable: true, code: '+  container.innerHTML = `<div class="result">Requête : ${query}</div>`;' },
      { oldLineNumber: 18, newLineNumber: 19, type: 'context', code: '}' },
    ],
    fixedDiff: [
      { oldLineNumber: 14, newLineNumber: 14, type: 'context', code: 'export function renderSearchResults(query: string) {' },
      { oldLineNumber: 15, newLineNumber: 15, type: 'context', code: '  const container = document.getElementById("search-output");' },
      { oldLineNumber: 16, newLineNumber: 16, type: 'context', code: '  if (!container) return;' },
      { newLineNumber: 17, type: 'add', code: '+  const div = document.createElement("div");' },
      { newLineNumber: 18, type: 'add', code: '+  div.className = "result";' },
      { newLineNumber: 19, type: 'add', code: '+  div.textContent = `Requête : ${query}`; // Échappement natif' },
      { newLineNumber: 20, type: 'add', code: '+  container.replaceChildren(div);' },
      { oldLineNumber: 18, newLineNumber: 21, type: 'context', code: '}' },
    ],
    comment: {
      author: 'Alexandre V.',
      role: 'Staff Engineer & Juge IA',
      avatarInitial: 'A',
      type: 'Vulnérabilité OWASP A03 : Cross-Site Scripting (XSS)',
      text: 'L’utilisation d’`innerHTML` avec une saisie utilisateur non assainie permet à un attaquant d’injecter des balises malveillantes (ex: `<img src=x onerror=stealSession()>`) et de voler les tokens d’authentification. Privilégiez `textContent` ou `replaceChildren`.',
      score: 95,
    },
  },
  {
    id: 'python',
    language: 'python',
    languageLabel: 'Python',
    color: '#3572A5',
    title: 'PR #215 : Récupération du profil membre par identifiant',
    ticket:
      '[JIRA-419] Endpoint REST rapide pour charger les données utilisateur à partir du paramètre d’URL.',
    persona: { name: 'Camille', tag: 'Data & Backend (code vite)' },
    category: 'Sécurité OWASP (SQLi)',
    severity: 'Critique',
    filename: 'backend/services/user_service.py',
    diff: [
      { oldLineNumber: 28, newLineNumber: 28, type: 'context', code: 'def get_user_profile(db_connection, user_id: str):' },
      { oldLineNumber: 29, newLineNumber: 29, type: 'context', code: '    cursor = db_connection.cursor()' },
      { oldLineNumber: 30, type: 'delete', code: '-    # Requête obsolète' },
      { newLineNumber: 30, type: 'add', isVulnerable: true, code: '+    # Concaténation par f-string vulnérable à l’injection' },
      { newLineNumber: 31, type: 'add', isVulnerable: true, code: '+    query = f"SELECT id, username, email FROM users WHERE id = \'{user_id}\'"' },
      { oldLineNumber: 31, newLineNumber: 32, type: 'context', code: '    cursor.execute(query)' },
      { oldLineNumber: 32, newLineNumber: 33, type: 'context', code: '    return cursor.fetchone()' },
    ],
    fixedDiff: [
      { oldLineNumber: 28, newLineNumber: 28, type: 'context', code: 'def get_user_profile(db_connection, user_id: str):' },
      { oldLineNumber: 29, newLineNumber: 29, type: 'context', code: '    cursor = db_connection.cursor()' },
      { newLineNumber: 30, type: 'add', code: '+    query = "SELECT id, username, email FROM users WHERE id = %s"' },
      { newLineNumber: 31, type: 'add', code: '+    cursor.execute(query, (user_id,)) # Requête paramétrée sécurisée' },
      { oldLineNumber: 32, newLineNumber: 32, type: 'context', code: '    return cursor.fetchone()' },
    ],
    comment: {
      author: 'Sarah K.',
      role: 'Lead Sécurité Applicative',
      avatarInitial: 'S',
      type: 'Vulnérabilité OWASP A03 : Injection SQL',
      text: 'L’interpolation de `user_id` via un f-string contourne l’échappement SQL. Un payload comme `\' OR \'1\'=\'1` permet d’exfiltrer la table complète. Utilisez impérativement le tuple de paramètres natif de votre pilote SQL.',
      score: 100,
    },
  },
  {
    id: 'go',
    language: 'go',
    languageLabel: 'Go',
    color: '#00ADD8',
    title: 'PR #77 : Collecte périodique d’événements en streaming',
    ticket:
      '[JIRA-501] Traiter un flux d’événements en tâche de fond pour optimiser la latence HTTP.',
    persona: { name: 'David', tag: 'Fullstack découvrant Go' },
    category: 'Performance & Concurrence',
    severity: 'Élevée',
    filename: 'pkg/collector/worker.go',
    diff: [
      { oldLineNumber: 42, newLineNumber: 42, type: 'context', code: 'func StreamEvents(ctx context.Context, items []string) <-chan Result {' },
      { oldLineNumber: 43, newLineNumber: 43, type: 'context', code: '    out := make(chan Result)' },
      { oldLineNumber: 44, newLineNumber: 44, type: 'context', code: '    go func() {' },
      { oldLineNumber: 45, type: 'delete', code: '-        // pas d’itération concurrente' },
      { newLineNumber: 45, type: 'add', isVulnerable: true, code: '+        for _, item := range items {' },
      { newLineNumber: 46, type: 'add', isVulnerable: true, code: '+            out <- processItem(item) // Bloquant si le récepteur s’arrête !' },
      { newLineNumber: 47, type: 'add', isVulnerable: true, code: '+        }' },
      { oldLineNumber: 46, newLineNumber: 48, type: 'context', code: '    }()' },
      { oldLineNumber: 47, newLineNumber: 49, type: 'context', code: '    return out' },
      { oldLineNumber: 48, newLineNumber: 50, type: 'context', code: '}' },
    ],
    fixedDiff: [
      { oldLineNumber: 42, newLineNumber: 42, type: 'context', code: 'func StreamEvents(ctx context.Context, items []string) <-chan Result {' },
      { oldLineNumber: 43, newLineNumber: 43, type: 'context', code: '    out := make(chan Result, len(items))' },
      { oldLineNumber: 44, newLineNumber: 44, type: 'context', code: '    go func() {' },
      { newLineNumber: 45, type: 'add', code: '+        defer close(out)' },
      { newLineNumber: 46, type: 'add', code: '+        for _, item := range items {' },
      { newLineNumber: 47, type: 'add', code: '+            select {' },
      { newLineNumber: 48, type: 'add', code: '+            case <-ctx.Done(): return // Respect de l’annulation' },
      { newLineNumber: 49, type: 'add', code: '+            case out <- processItem(item):' },
      { newLineNumber: 50, type: 'add', code: '+            }' },
      { newLineNumber: 51, type: 'add', code: '+        }' },
      { oldLineNumber: 46, newLineNumber: 52, type: 'context', code: '    }()' },
      { oldLineNumber: 47, newLineNumber: 53, type: 'context', code: '    return out' },
      { oldLineNumber: 48, newLineNumber: 54, type: 'context', code: '}' },
    ],
    comment: {
      author: 'Marc B.',
      role: 'Staff Backend & Concurrence',
      avatarInitial: 'M',
      type: 'Fuite de ressources : Goroutine Leak',
      text: 'Le canal n’étant pas tamponné et dépourvu de vérification de `ctx.Done()`, la goroutine reste bloquée en mémoire si le consommateur annule la requête. En production sous fort trafic, cela cause une fuite de mémoire fatale.',
      score: 92,
    },
  },
  {
    id: 'rust',
    language: 'rust',
    languageLabel: 'Rust',
    color: '#dea584',
    title: 'PR #133 : Optimisation bas niveau du module de chiffrement',
    ticket:
      '[JIRA-612] Supprimer les allocations intermédiaires lors du parsing du payload cryptographique.',
    persona: { name: 'Théo', tag: 'Junior Rustacean ambitieux' },
    category: 'Architecture & Sûreté mémoire',
    severity: 'Élevée',
    filename: 'src/crypto/vault.rs',
    diff: [
      { oldLineNumber: 88, newLineNumber: 88, type: 'context', code: 'pub fn decrypt_block(ptr: *const u8, len: usize) -> Result<Vec<u8>, CryptError> {' },
      { oldLineNumber: 89, type: 'delete', code: '-    // validation préalable du tampon' },
      { newLineNumber: 89, type: 'add', isVulnerable: true, code: '+    unsafe {' },
      { newLineNumber: 90, type: 'add', isVulnerable: true, code: '+        // Déréférencement aveugle : aucun test sur la nullité du pointeur' },
      { newLineNumber: 91, type: 'add', isVulnerable: true, code: '+        let slice = std::slice::from_raw_parts(ptr, len);' },
      { newLineNumber: 92, type: 'add', isVulnerable: true, code: '+        decrypt_raw(slice)' },
      { newLineNumber: 93, type: 'add', isVulnerable: true, code: '+    }' },
      { oldLineNumber: 90, newLineNumber: 94, type: 'context', code: '}' },
    ],
    fixedDiff: [
      { oldLineNumber: 88, newLineNumber: 88, type: 'context', code: 'pub fn decrypt_block(ptr: *const u8, len: usize) -> Result<Vec<u8>, CryptError> {' },
      { newLineNumber: 89, type: 'add', code: '+    if ptr.is_null() || len == 0 {' },
      { newLineNumber: 90, type: 'add', code: '+        return Err(CryptError::InvalidBuffer);' },
      { newLineNumber: 91, type: 'add', code: '+    }' },
      { newLineNumber: 92, type: 'add', code: '+    unsafe {' },
      { newLineNumber: 93, type: 'add', code: '+        let slice = std::slice::from_raw_parts(ptr, len);' },
      { newLineNumber: 94, type: 'add', code: '+        decrypt_raw(slice)' },
      { newLineNumber: 95, type: 'add', code: '+    }' },
      { oldLineNumber: 90, newLineNumber: 96, type: 'context', code: '}' },
    ],
    comment: {
      author: 'Elena D.',
      role: 'Rust Security Specialist',
      avatarInitial: 'E',
      type: 'Comportement Indéfini (UB) & Crash mémoire',
      text: 'Appeler `from_raw_parts` avec un pointeur nul ou mal aligné constitue un comportement indéfini (Undefined Behavior) immédiat pouvant conduire à une corruption mémoire ou un crash système. Validez toujours `ptr.is_null()`.',
      score: 96,
    },
  },
  {
    id: 'php',
    language: 'php',
    languageLabel: 'PHP',
    color: '#4F5D95',
    title: 'PR #91 : Restauration des préférences de session utilisateur',
    ticket:
      '[JIRA-290] Charger les paramètres enregistrés dans le cookie lors de la reconnexion.',
    persona: { name: 'Lucas', tag: 'Habitué aux anciens patterns PHP' },
    category: 'Sécurité OWASP (Désérialisation)',
    severity: 'Critique',
    filename: 'app/Http/Controllers/SessionController.php',
    diff: [
      { oldLineNumber: 50, newLineNumber: 50, type: 'context', code: 'public function restoreSettings(Request $request) {' },
      { oldLineNumber: 51, newLineNumber: 51, type: 'context', code: '    $cookieData = $request->cookie("user_prefs");' },
      { oldLineNumber: 52, type: 'delete', code: '-    // ancienne méthode statique' },
      { newLineNumber: 52, type: 'add', isVulnerable: true, code: '+    // Désérialisation brute d’une entrée manipulable par le client' },
      { newLineNumber: 53, type: 'add', isVulnerable: true, code: '+    $settings = unserialize(base64_decode($cookieData));' },
      { oldLineNumber: 53, newLineNumber: 54, type: 'context', code: '    return response()->json($settings);' },
      { oldLineNumber: 54, newLineNumber: 55, type: 'context', code: '}' },
    ],
    fixedDiff: [
      { oldLineNumber: 50, newLineNumber: 50, type: 'context', code: 'public function restoreSettings(Request $request) {' },
      { oldLineNumber: 51, newLineNumber: 51, type: 'context', code: '    $cookieData = $request->cookie("user_prefs");' },
      { newLineNumber: 52, type: 'add', code: '+    $settings = json_decode(base64_decode($cookieData), true);' },
      { newLineNumber: 53, type: 'add', code: '+    if (json_last_error() !== JSON_ERROR_NONE) {' },
      { newLineNumber: 54, type: 'add', code: '+        return response()->json(["error" => "Format corrompu"], 400);' },
      { newLineNumber: 55, type: 'add', code: '+    }' },
      { oldLineNumber: 53, newLineNumber: 56, type: 'context', code: '    return response()->json($settings);' },
      { oldLineNumber: 54, newLineNumber: 57, type: 'context', code: '}' },
    ],
    comment: {
      author: 'Claire M.',
      role: 'Consultante Audit & Pentest',
      avatarInitial: 'C',
      type: 'Vulnérabilité OWASP A08 : Insecure Deserialization (RCE)',
      text: 'L’exécution de `unserialize()` sur des cookies forgés par le client permet l’injection d’objets et l’exécution de code arbitraire à distance (RCE) via des classes magiques (`__wakeup`, `__destruct`). Utilisez impérativement `json_decode()`.',
      score: 98,
    },
  },
]

const SUPPORTED_LANGUAGES = [
  {
    name: 'TypeScript',
    tag: 'Web & Node.js',
    color: '#3178c6',
    flaws: 'XSS, React hooks memory leaks, JWT bypass, async pitfalls',
    level: 'Junior → Senior',
  },
  {
    name: 'Python',
    tag: 'Backend & Data',
    color: '#3572A5',
    flaws: 'Injections SQL, race conditions FastAPI, pickle RCE, mutables globaux',
    level: 'Junior → Senior',
  },
  {
    name: 'Go',
    tag: 'Microservices & Cloud',
    color: '#00ADD8',
    flaws: 'Goroutine leaks, nil pointer panics, channel deadlocks, secrets en dur',
    level: 'Intermédiaire → Senior',
  },
  {
    name: 'Rust',
    tag: 'Système & Performance',
    color: '#dea584',
    flaws: 'Unsafe blocks injustifiés, bugs de lifetime, panics unwrap() en prod',
    level: 'Intermédiaire → Senior',
  },
  {
    name: 'Java & C#',
    tag: 'Enterprise & APIs',
    color: '#b07219',
    flaws: 'SSRF, désérialisation XML/binaire, saturation de pool de connexions',
    level: 'Junior → Senior',
  },
  {
    name: 'PHP',
    tag: 'Modern Web Backend',
    color: '#4F5D95',
    flaws: 'Insecure deserialization, comparaison faible ==, failles upload',
    level: 'Junior → Intermédiaire',
  },
]

export default function Home() {
  const { data: session } = authClient.useSession()
  const isAuthenticated = Boolean(session?.user)
  const displayName = session?.user?.name || session?.user?.email || 'Développeur'

  const [activeTabId, setActiveTabId] = useState<string>('typescript')
  const [viewMode, setViewMode] = useState<'anomaly' | 'solution'>('anomaly')

  const currentScenario =
    DEMO_SCENARIOS.find((s) => s.id === activeTabId) || DEMO_SCENARIOS[0]

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
                  Bonjour <strong className="welcome-pseudo">{displayName}</strong> ! Prêt pour une nouvelle revue de code ?
                </span>
              </div>
            ) : (
              <div className="hero-badge">
                <Sparkles size={14} className="hero-badge-icon" />
                <span>Plateforme d'entraînement à la Code Review pour développeurs</span>
              </div>
            )}

            <h1 id="hero-title" className="hero-title">
              Maîtrisez la revue de code.
              <span className="hero-title-highlight"> Détectez ce que l’IA ne voit pas.</span>
            </h1>

            <p className="hero-description">
              On apprend activement à écrire du code, mais presque jamais à auditer
              celui des autres. Entraînez-vous sur des Pull Requests réalistes
              multi-langages, décelez les failles de sécurité OWASP et aiguisez
              votre esprit critique en équipe.
            </p>

            <div className="hero-cta-group">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="hero-btn-primary">
                    <LayoutDashboard size={18} />
                    <span>Tableau de bord de {displayName}</span>
                    <ArrowRight size={18} />
                  </Link>
                  <a href="#demo" className="hero-btn-secondary">
                    <span>Explorer la démo de code</span>
                  </a>
                </>
              ) : (
                <>
                  <Link to="/register" className="hero-btn-primary">
                    <UserPlus size={18} />
                    <span>Créer un compte gratuit</span>
                    <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="hero-btn-secondary">
                    <LogIn size={18} />
                    <span>Se connecter</span>
                  </Link>
                  <Link to="/dashboard" className="hero-btn-outline">
                    <LayoutDashboard size={18} />
                    <span>Accéder au Dashboard</span>
                  </Link>
                </>
              )}
            </div>

            {/* Statistiques / Preuves de valeur */}
            <div className="hero-metrics" role="region" aria-label="Chiffres clés">
              <div className="metric-item">
                <div className="metric-value">7+</div>
                <div className="metric-label">Langages supportés</div>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <div className="metric-value">3 Niveaux</div>
                <div className="metric-label">Junior, Intermédiaire, Senior</div>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <div className="metric-value">100%</div>
                <div className="metric-label">Façon GitHub Pull Request</div>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <div className="metric-value">OWASP & Perf</div>
                <div className="metric-label">Scénarios d’audit réels</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section Le Code en direct (Interactive PR Review Showcase) */}
        <section id="demo" className="demo-section" aria-labelledby="demo-title">
          <div className="section-header">
            <div className="section-pill">
              <GitPullRequest size={14} />
              <span>Expérience Interactive</span>
            </div>
            <h2 id="demo-title" className="section-title">
              L’anatomie d’une véritable revue de code
            </h2>
            <p className="section-subtitle">
              Inspectez le contexte métier, parcourez le diff Git unifié, commentez la
              ligne suspecte et comparez votre analyse avec le verdict de notre juge IA.
            </p>
          </div>

          <div className="demo-workspace">
            {/* Sélecteur de langage / scénario */}
            <div className="demo-language-tabs" role="tablist" aria-label="Langages de démo">
              {DEMO_SCENARIOS.map((scenario) => {
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
                      <GitPullRequest size={14} /> PR Ouverte
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
                      <span>Code soumis (Anomalie)</span>
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === 'solution' ? 'active' : ''}`}
                      onClick={() => setViewMode('solution')}
                    >
                      <CheckCircle2 size={14} />
                      <span>Solution attendue (Fix)</span>
                    </button>
                  </div>
                </div>

                <div className="pr-meta-row">
                  <div className="pr-author">
                    <span className="author-label">Auteur :</span>
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
                    <span>Contexte du ticket métier :</span>
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
                          <span>Analyse validée par le juge d’évaluation</span>
                        </span>
                        <button
                          type="button"
                          className="btn-switch-solution"
                          onClick={() => setViewMode('solution')}
                        >
                          <span>Voir le correctif idéal</span>
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
              <span>Multi-langages & Couverture</span>
            </div>
            <h2 id="languages-title" className="section-title">
              Formez votre regard sur les langages modernes
            </h2>
            <p className="section-subtitle">
              Chaque écosystème possède ses failles caractéristiques et ses erreurs de
              concurrence. Explorez des pièges authentiques inspirés des incidents de
              production réels.
            </p>
          </div>

          <div className="languages-grid">
            {SUPPORTED_LANGUAGES.map((lang) => (
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
                  <div className="flaw-label">Anomalies ciblées :</div>
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
              <div className="mystery-badge">Nouveau • Mode Défi</div>
              <h3 className="mystery-title">Prêt pour l’audit à l’aveugle ? Testez le Mode Mystère</h3>
              <p className="mystery-desc">
                Le langage, la difficulté et la thématique d’erreur sont masqués au départ.
                Vous devez lire le diff sans indice préalable, repérer l’anomalie et formuler
                votre critique en conditions réelles.
              </p>
            </div>
            <div className="mystery-action">
              <Link to="/dashboard" className="mystery-btn">
                <span>Défier le Mode Mystère</span>
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
              <span>Méthodologie</span>
            </div>
            <h2 id="workflow-title" className="section-title">
              Comment progresser avec Code How?
            </h2>
            <p className="section-subtitle">
              Une boucle d’apprentissage conçue pour transformer la relecture de code en un
              réflexe d’ingénierie rigoureux et constructif.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">Sélection du Scénario</h3>
              <p className="step-desc">
                Filtrez par langage de prédilection, par niveau d’expérience (Junior,
                Intermédiaire, Senior) ou activez le Mode Mystère aléatoire.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">Inspection du Diff Git</h3>
              <p className="step-desc">
                Parcourez le contexte du ticket Jira et le diff de la Pull Request avec
                coloration syntaxique et repérage des modifications suspectes.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">Commentaire Inline</h3>
              <p className="step-desc">
                Cliquez directement sur la ligne fautive pour formuler votre retour critique,
                expliquer la faille et proposer l’alternative recommandée.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">04</div>
              <h3 className="step-title">Évaluation IA & Score</h3>
              <p className="step-desc">
                Recevez une note sur 100, analysez le débriefing détaillé du juge et
                découvrez la Ground Truth corrigée pour ancrer vos acquis.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Section Tableau de Bord & Progression */}
        <section id="progression" className="dashboard-preview-section" aria-labelledby="progression-title">
          <div className="progression-card">
            <div className="progression-content">
              <div className="section-pill">
                <Award size={14} />
                <span>Espace Personnel</span>
              </div>
              <h2 id="progression-title" className="section-title text-left">
                Votre tableau de bord personnel
              </h2>
              <p className="progression-desc">
                Suivez votre courbe de progression temporelle, analysez vos scores par
                thématique (Sécurité OWASP, Performance, Architecture) et conservez un
                historique consultable de chaque scénario audité.
              </p>

              <div className="progression-features">
                <div className="p-feature">
                  <CheckCircle2 size={16} className="icon-success" />
                  <span>Courbe d’évolution des scores calculée en direct</span>
                </div>
                <div className="p-feature">
                  <CheckCircle2 size={16} className="icon-success" />
                  <span>Historique des Pull Requests et solutions conservé</span>
                </div>
                <div className="p-feature">
                  <CheckCircle2 size={16} className="icon-success" />
                  <span>Gestion du profil, pseudonyme et photo personnalisée</span>
                </div>
              </div>

              <div className="progression-actions">
                <Link to="/dashboard" className="btn-dashboard-main">
                  <LayoutDashboard size={18} />
                  <span>Ouvrir mon Tableau de Bord</span>
                  <ArrowRight size={18} />
                </Link>
                {!isAuthenticated && (
                  <Link to="/register" className="btn-dashboard-sub">
                    <span>Créer un compte pour sauvegarder</span>
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
                  <span className="fake-title">Score de Progression • Code How?</span>
                </div>
                <div className="fake-stat-row">
                  <div className="fake-stat">
                    <span className="fake-stat-num">85%</span>
                    <span className="fake-stat-lbl">Moyenne Globale</span>
                  </div>
                  <div className="fake-stat">
                    <span className="fake-stat-num">12</span>
                    <span className="fake-stat-lbl">Audits Réalisés</span>
                  </div>
                  <div className="fake-stat">
                    <span className="fake-stat-num">Top 15%</span>
                    <span className="fake-stat-lbl">Régularité</span>
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
              Prêt à transformer votre façon de relire le code ?
            </h2>
            <p className="cta-banner-text">
              Rejoignez les développeurs qui refusent d’approuver machinalement les Pull
              Requests et développez l’expertise technique recherchée par les meilleures équipes.
            </p>

            <div className="cta-banner-buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="hero-btn-primary">
                  <LayoutDashboard size={18} />
                  <span>Tableau de bord de {displayName}</span>
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="hero-btn-primary">
                    <UserPlus size={18} />
                    <span>Créer un compte gratuit</span>
                    <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="hero-btn-secondary">
                    <LogIn size={18} />
                    <span>Se connecter</span>
                  </Link>
                  <Link to="/dashboard" className="hero-btn-outline">
                    <LayoutDashboard size={18} />
                    <span>Accéder au Dashboard</span>
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
