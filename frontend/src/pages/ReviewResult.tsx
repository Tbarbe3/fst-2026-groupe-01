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
        <Link to="/dashboard">Retour au tableau de bord</Link>
      </div>
    </div>
  )
}
