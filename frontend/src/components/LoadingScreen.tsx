interface LoadingScreenProps {
  label?: string
}

/**
 * Unique rendu d'attente de l'application. `role="status"` et `aria-live`
 * font annoncer le changement par les lecteurs d'écran, qui autrement ne
 * signalent rien pendant le chargement.
 */
export default function LoadingScreen({
  label = 'Chargement…',
}: LoadingScreenProps) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span className="loading-label">{label}</span>
    </div>
  )
}
