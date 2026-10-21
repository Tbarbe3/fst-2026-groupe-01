import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, challengesApi } from '../api/challenges'
import ChallengeLauncher from './ChallengeLauncher'

vi.mock('../api/challenges', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/challenges')>()
  return { ...actual, challengesApi: { create: vi.fn() } }
})

const create = vi.mocked(challengesApi.create)

function renderLauncher() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <ChallengeLauncher /> },
      { path: '/review/:id', element: <p>Page Review</p> },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ChallengeLauncher', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crée un challenge avec les paramètres choisis puis ouvre la revue', async () => {
    create.mockResolvedValue({ attemptId: 'a1' })
    const user = userEvent.setup()
    renderLauncher()

    await user.selectOptions(screen.getByLabelText('Difficulté'), '5')
    await user.click(screen.getByRole('button', { name: /Lancer le challenge/ }))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ difficulty: '5' }))
    expect(await screen.findByText('Page Review')).toBeInTheDocument()
  })

  it('lance le mode Mystère sans paramètres', async () => {
    create.mockResolvedValue({ attemptId: 'a2' })
    const user = userEvent.setup()
    renderLauncher()

    await user.click(screen.getByRole('button', { name: /Mode Mystère/ }))

    expect(create).toHaveBeenCalledWith({ mystery: true })
  })

  it('affiche l’erreur renvoyée par l’API', async () => {
    create.mockRejectedValue(new ApiError('Trop de challenges en cours.', 429))
    const user = userEvent.setup()
    renderLauncher()

    await user.click(screen.getByRole('button', { name: /Lancer le challenge/ }))

    expect(await screen.findByText('Trop de challenges en cours.')).toBeInTheDocument()
  })
})
