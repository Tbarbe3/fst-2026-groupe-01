interface FeedbackMessageProps {
  kind: 'error' | 'success'
  children: React.ReactNode
}

/**
 * L'icône et le préfixe « Erreur : » doublent l'information portée par la
 * couleur, que tous les utilisateurs ne perçoivent pas de la même façon.
 */
export default function FeedbackMessage({
  kind,
  children,
}: FeedbackMessageProps) {
  const isError = kind === 'error'

  return (
    <p
      className={`feedback-message ${isError ? 'feedback-error' : 'feedback-success'}`}
      role={isError ? 'alert' : 'status'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        {isError ? (
          <>
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        ) : (
          <polyline points="8 12.5 11 15.5 16 9" />
        )}
      </svg>
      <span>
        <strong>{isError ? 'Erreur' : 'Succès'} : </strong>
        {children}
      </span>
    </p>
  )
}
