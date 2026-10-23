import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { challengesApi, type AttemptInProgress } from '@/api/challenges.ts'
import Review from '../Review'

vi.mock('../../api/challenges', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/challenges')>()
  return { ...actual, challengesApi: { get: vi.fn(), submit: vi.fn() } }
})

const ATTEMPT: AttemptInProgress = {
  id: 'a1',
  status: 'in_progress',
  isMystery: false,
  startedAt: '2026-10-21T10:00:00.000Z',
  scenario: {
    id: 's1',
    title: 'PR #12 : Total du panier',
    ticketContext: 'Ajouter les frais de port.',
    language: 'java',
    difficulty: '1',
    category: 'business_logic',
    persona: { name: 'Lucas', archetype: 'stagiaire', bio: 'Débutant' },
    files: [
      {
        path: 'Cart.java',
        lines: [
          { type: 'context', code: 'double sum = 0;', oldLineNumber: 1, newLineNumber: 1 },
          { type: 'add', code: 'sum += price', newLineNumber: 2 },
        ],
      },
    ],
  },
}

function renderReview() {
  const router = createMemoryRouter(
    [
      { path: '/review/:challengeId', element: <Review /> },
      { path: '/review/:challengeId/result', element: <p>Page Résultat</p> },
    ],
    { initialEntries: ['/review/a1'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(challengesApi.get).mockResolvedValue(ATTEMPT)
    vi.mocked(challengesApi.submit).mockResolvedValue({ attemptId: 'a1', score: 80 })
  })

  it('ouvre l’aide à la première partie seulement', async () => {
    const user = userEvent.setup()
    const { unmount } = renderReview()

    expect(await screen.findByRole('heading', { name: 'Comment jouer ?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fermer l’aide' }))
    unmount()

    renderReview()
    await screen.findByText('PR #12 : Total du panier')
    expect(screen.queryByRole('heading', { name: 'Comment jouer ?' })).not.toBeInTheDocument()
  })

  it('demande confirmation avant d’approuver sans remarque', async () => {
    const user = userEvent.setup()
    renderReview()

    await user.click(await screen.findByRole('button', { name: /Approuver sans remarque/ }))
    expect(screen.getByText('Approuver la PR telle quelle ?')).toBeInTheDocument()
    expect(challengesApi.submit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Oui, approuver' }))
    expect(challengesApi.submit).toHaveBeenCalledWith('a1', [])
  })

  it('envoie la remarque écrite après un clic sur la ligne', async () => {
    const user = userEvent.setup()
    renderReview()

    await user.click(await screen.findByText('sum += price'))
    await user.type(screen.getByLabelText('Remarque sur la ligne 2'), 'Point-virgule manquant')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la remarque' }))
    await user.click(screen.getByRole('button', { name: 'Envoyer ma revue (1)' }))

    expect(challengesApi.submit).toHaveBeenCalledWith('a1', [
      { file_path: 'Cart.java', line_number: 2, text: 'Point-virgule manquant' },
    ])
    expect(await screen.findByText('Page Résultat')).toBeInTheDocument()
  })

  it('conserve les remarques non envoyées pour reprendre la partie plus tard', async () => {
    const user = userEvent.setup()
    const { unmount } = renderReview()

    await user.click(await screen.findByText('sum += price'))
    await user.type(screen.getByLabelText('Remarque sur la ligne 2'), 'Brouillon')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la remarque' }))
    unmount()

    renderReview()
    expect(await screen.findByRole('button', { name: 'Envoyer ma revue (1)' })).toBeInTheDocument()
  })

  it('permet de quitter la partie vers le tableau de bord', async () => {
    renderReview()
    expect(await screen.findByRole('link', { name: /Retour au tableau de bord/ })).toHaveAttribute('href', '/dashboard')
  })
})
