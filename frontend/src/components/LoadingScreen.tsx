interface LoadingScreenProps {
  label?: string
}

/**
 * Unique rendu d'attente. `role="status"` et `aria-live` le font annoncer
 * par les lecteurs d'écran, muets sans eux pendant un chargement.
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
