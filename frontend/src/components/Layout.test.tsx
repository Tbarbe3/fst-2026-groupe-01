import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authClientMock,
  sessionActive,
  sessionPending,
} from '@/tests/session'
import Layout from './Layout'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function renderLayout() {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [{ index: true, element: <p>Contenu de la page</p> }],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // C'est ce comportement qui dispense les pages de gérer `isPending` :
  // s'il régresse, chaque page devra le reprendre à son compte.
  it("n'affiche aucune route tant que la session est en cours de résolution", () => {
    sessionPending()
    renderLayout()
    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
    expect(screen.queryByText('Contenu de la page')).not.toBeInTheDocument()
  })

  it('monte la route une fois la session résolue', () => {
    sessionActive()
    renderLayout()
    expect(screen.getByText('Contenu de la page')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('expose le sélecteur de thème sur toutes les pages', () => {
    sessionActive()
    renderLayout()
    expect(
      screen.getByRole('button', { name: /Passer en thème/ }),
    ).toBeInTheDocument()
  })
})
