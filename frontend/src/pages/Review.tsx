import { Link, useParams } from 'react-router'

export default function Review() {
  const { challengeId } = useParams()

  return (
    <div className="auth-container">
      <div className="auth-card dashboard">
        <h2>Revue de code</h2>
        <p>
          Challenge <code>{challengeId}</code>. Le contexte du ticket, le diff
          et les commentaires en ligne restent à implémenter.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Link to={`/review/${challengeId}/result`} className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Voir le débriefing
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/dashboard">Tableau de bord</Link>
            <span>•</span>
            <Link to="/">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
