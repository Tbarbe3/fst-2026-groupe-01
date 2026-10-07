import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import FeedbackMessage from './FeedbackMessage'

describe('FeedbackMessage', () => {
  it('rend une erreur avec le rôle alert', () => {
    render(<FeedbackMessage kind="error">Mot de passe incorrect.</FeedbackMessage>)
    expect(screen.getByRole('alert')).toHaveTextContent('Mot de passe incorrect.')
  })

  it('rend un succès avec le rôle status', () => {
    render(<FeedbackMessage kind="success">Compte créé.</FeedbackMessage>)
    expect(screen.getByRole('status')).toHaveTextContent('Compte créé.')
  })

  // Exigence d'accessibilité : la couleur ne doit pas être le seul indice,
  // sans quoi un daltonien ne distingue pas une erreur d'un succès.
  it('double la couleur par un préfixe textuel', () => {
    const { rerender } = render(
      <FeedbackMessage kind="error">Détail</FeedbackMessage>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Erreur :')

    rerender(<FeedbackMessage kind="success">Détail</FeedbackMessage>)
    expect(screen.getByRole('status')).toHaveTextContent('Succès :')
  })

  it('double la couleur par une icône', () => {
    const { container } = render(
      <FeedbackMessage kind="error">Détail</FeedbackMessage>,
    )
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
