import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authClientMock,
  sessionAbsent,
  sessionActive,
  sessionWithoutUser,
} from '@/tests/session'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [{ path: 'dashboard', element: <p>Contenu protégé</p> }],
      },
      { path: '/login', element: <p>Page de connexion</p> },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('laisse passer un utilisateur authentifié', () => {
    sessionActive()
    renderAt('/dashboard')
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })

  it('redirige un visiteur non authentifié vers la connexion', () => {
    sessionAbsent()
    renderAt('/dashboard')
    expect(screen.getByText('Page de connexion')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  // Sans ce cas, l'accès à `session.user.name` lèverait et laisserait un écran
  // blanc, sans même un bouton pour se déconnecter du cookie fautif.
  it('offre une sortie quand la session est incomplète', () => {
    sessionWithoutUser()
    renderAt('/dashboard')
    expect(screen.getByText('Session invalide')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Se déconnecter' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })
})
