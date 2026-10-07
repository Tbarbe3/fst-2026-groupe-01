import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  it('propose de passer en clair quand le thème est sombre', () => {
    render(<ThemeToggle />)
    expect(
      screen.getByRole('button', { name: 'Passer en thème clair' }),
    ).toBeInTheDocument()
  })

  it('bascule le thème et inverse son libellé', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Passer en thème clair' }))

    expect(document.documentElement.dataset['theme']).toBe('light')
    expect(
      screen.getByRole('button', { name: 'Passer en thème sombre' }),
    ).toBeInTheDocument()
  })

  it('persiste la préférence', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))

    expect(localStorage.getItem('codehow-theme')).toBe('light')
  })
})
