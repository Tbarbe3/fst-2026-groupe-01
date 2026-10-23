import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { challengesApi } from '@/api/challenges.ts'
import Dashboard from '../Dashboard'

vi.mock('../../api/challenges', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/challenges')>()
  return {
    ...actual,
    challengesApi: {
      ...actual.challengesApi,
      history: vi.fn(),
      create: vi.fn(),
    },
  }
})

vi.mock('../../auth', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { name: 'Alice', email: 'alice@example.com' } },
    }),
  },
}))

const mockHistory = vi.mocked(challengesApi.history)

function renderDashboard() {
  const router = createMemoryRouter(
    [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/review/:id/result', element: <p>Page Result</p> },
    ],
    { initialEntries: ['/dashboard'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le message d’état vide quand il n’y a aucun challenge', async () => {
    mockHistory.mockResolvedValue({ attempts: [], inProgress: [] })
    renderDashboard()

    expect(await screen.findByText('Aucune revue terminée')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nouveau challenge' })).toBeInTheDocument()
  })

  it('affiche la liste des challenges regroupés par catégorie et permet la sélection', async () => {
    mockHistory.mockResolvedValue({
      attempts: [
        {
          id: 'att-1',
          title: 'Vulnérabilité XSS dans la recherche',
          language: 'typescript',
          category: 'security_owasp',
          difficulty: '3',
          score: 85,
          submittedAt: '2026-10-18T10:00:00.000Z',
        },
      ],
      inProgress: [],
    })

    const user = userEvent.setup()
    renderDashboard()

    expect(await screen.findByText('Vulnérabilité XSS dans la recherche')).toBeInTheDocument()
    expect(screen.getAllByText('85%').length).toBeGreaterThanOrEqual(1)

    // Cliquer sur le scénario pour afficher ses détails
    await user.click(screen.getByText('Vulnérabilité XSS dans la recherche'))

    expect(await screen.findByRole('heading', { name: 'Détails du challenge' })).toBeInTheDocument()
    expect(screen.getByText('Excellente analyse')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Consulter le débriefing complet/ })).toBeInTheDocument()

    // Cliquer sur "Nouveau challenge" pour revenir au lanceur
    const newChallengeBtns = screen.getAllByRole('button', { name: /Nouveau challenge/i })
    await user.click(newChallengeBtns[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lancer le challenge/i })).toBeInTheDocument()
    })
  })

  it('propose de reprendre une partie non soumise, sans dévoiler un challenge Mystère', async () => {
    mockHistory.mockResolvedValue({
      attempts: [],
      inProgress: [
        { id: 'att-9', title: 'PR #8 : Mot de passe', language: 'python', category: null, difficulty: null, isMystery: true, startedAt: '2026-10-22T08:00:00.000Z' },
        { id: 'att-7', title: 'PR #12 : Panier', language: 'java', category: 'business_logic', difficulty: '2', isMystery: false, startedAt: '2026-10-21T08:00:00.000Z' },
      ],
    })
    renderDashboard()

    const section = (await screen.findByRole('heading', { name: 'Challenges en cours' })).closest('section')!
    const links = within(section).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/review/att-9', '/review/att-7'])
    expect(within(links[0]!).getByText('Mode Mystère')).toBeInTheDocument()
    expect(within(links[1]!).getByText('Niveau 2 — Bug évident')).toBeInTheDocument()
  })
})
