import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClientMock, sessionAbsent, sessionActive } from '@/tests/session'
import GuestRoute from './GuestRoute'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function renderLogin() {
  const router = createMemoryRouter(
    [
      {
        element: <GuestRoute />,
        children: [{ path: 'login', element: <p>Formulaire de connexion</p> }],
      },
      { path: '/dashboard', element: <p>Tableau de bord</p> },
    ],
    { initialEntries: ['/login'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('GuestRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le formulaire à un visiteur', () => {
    sessionAbsent()
    renderLogin()
    expect(screen.getByText('Formulaire de connexion')).toBeInTheDocument()
  })

  it('renvoie un utilisateur déjà connecté vers le tableau de bord', () => {
    sessionActive()
    renderLogin()
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
    expect(screen.queryByText('Formulaire de connexion')).not.toBeInTheDocument()
  })
})
