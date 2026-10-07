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
        <Link to={`/review/${challengeId}/result`}>Voir le débriefing</Link>
      </div>
    </div>
  )
}
