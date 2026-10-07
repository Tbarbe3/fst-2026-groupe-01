import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('affiche le libellé par défaut en français', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('accepte un libellé personnalisé', () => {
    render(<LoadingScreen label="Chargement des challenges…" />)
    expect(screen.getByText('Chargement des challenges…')).toBeInTheDocument()
  })

  it("s'annonce aux lecteurs d'écran", () => {
    render(<LoadingScreen />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('masque le spinner décoratif aux technologies d’assistance', () => {
    const { container } = render(<LoadingScreen />)
    const spinner = container.querySelector('.loading-spinner')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })
})
