import { Link, useParams } from 'react-router'

export default function ReviewResult() {
  const { challengeId } = useParams()

  return (
    <div className="auth-container">
      <div className="auth-card dashboard">
        <h2>Débriefing</h2>
        <p>
          Challenge <code>{challengeId}</code>. La note, le comparatif avec la
          ground truth et l'analyse du juge restent à implémenter.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Link to="/dashboard" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Retour au tableau de bord
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
