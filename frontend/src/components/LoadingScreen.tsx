import { useI18n } from '../i18n'

interface LoadingScreenProps {
  label?: string
}

/**
 * Unique rendu d'attente. `role="status"` et `aria-live` le font annoncer
 * par les lecteurs d'écran, muets sans eux pendant un chargement.
 */
export default function LoadingScreen({ label }: LoadingScreenProps) {
  const { t } = useI18n()
  const displayLabel = label ?? t('common.loading')

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span className="loading-label">{displayLabel}</span>
    </div>
  )
}
