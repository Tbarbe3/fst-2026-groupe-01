import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="auth-container">
      <div className="auth-card dashboard">
        <h2>Page introuvable</h2>
        <p>Cette adresse ne correspond à aucune page de l'application.</p>
        <Link to="/">Revenir à l'accueil</Link>
      </div>
    </div>
  )
}
