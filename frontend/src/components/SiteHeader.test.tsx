import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClientMock, sessionAbsent, sessionActive } from '@/tests/session.ts'
import SiteHeader from './SiteHeader'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <SiteHeader /> }], {
    initialEntries: [path],
  })
  return render(<RouterProvider router={router} />)
}

describe('SiteHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionAbsent()
  })

  it('ouvre les paramètres du compte depuis la pastille utilisateur', async () => {
    sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
    renderAt('/dashboard')

    await userEvent.click(screen.getByRole('button', { name: /Paramètres du compte de Alice/ }))
    expect(screen.getByText('Paramètres du Compte')).toBeInTheDocument()
  })

  // Hors de l'accueil, une ancre seule pointerait vers une section inexistante.
  it('fait pointer les ancres vers l’accueil depuis une autre page', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('link', { name: 'Langages' })).toHaveAttribute('href', '/#languages')
  })
})
