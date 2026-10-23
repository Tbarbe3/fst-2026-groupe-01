import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { challengesApi, type AttemptSubmitted, type GroundTruthItem } from '@/api/challenges.ts'
import ReviewResult from '../ReviewResult'

vi.mock('../../api/challenges', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/challenges')>()
  return { ...actual, challengesApi: { get: vi.fn() } }
})

const issue = (id: string, line: number, expected: string): GroundTruthItem => ({
  id,
  file: 'Cart.java',
  line_number: line,
  lines: [line],
  type: 'business_logic',
  severity: 'major',
  expected_issue: expected,
  why: `Pourquoi ${id}`,
  ideal_fix: `Correctif ${id}`,
  fixed_lines: [`fixed ${id};`],
})

const ATTEMPT: AttemptSubmitted = {
  id: 'a1',
  status: 'submitted',
  isMystery: false,
  score: 64,
  scoreBreakdown: { found: 1, total: 2, false_positives: 1, reasoning_quality: 80, detection: 36, explanation: 24, precision: 5 },
  aiSummary: 'Une anomalie sur deux repérée.',
  judgedBy: 'ai',
  startedAt: '2026-10-21T10:00:00.000Z',
  submittedAt: '2026-10-21T10:10:00.000Z',
  scenario: {
    id: 's1',
    title: 'PR #12 : Total du panier',
    ticketContext: 'Frais de port.',
    language: 'java',
    difficulty: '1',
    category: 'business_logic',
    persona: { name: 'Lucas', archetype: 'stagiaire', bio: 'Débutant' },
    files: [
      {
        path: 'Cart.java',
        lines: [
          { type: 'add', code: 'sum += price', newLineNumber: 2 },
          { type: 'add', code: 'return total', newLineNumber: 3 },
        ],
      },
    ],
    groundTruth: [issue('I1', 2, 'Point-virgule manquant'), issue('I2', 3, 'Mauvaise variable retournée')],
  },
  comments: [
    { file_path: 'Cart.java', line_number: 2, text: 'Il manque un ;', matched_issue_id: 'I1', clarity_score: 80, feedback: 'Exact.' },
    { file_path: 'Cart.java', line_number: 9, text: 'Nom peu clair', matched_issue_id: null, clarity_score: 0, feedback: 'Hors cible.' },
  ],
}

function renderResult() {
  const router = createMemoryRouter(
    [
      { path: '/review/:challengeId/result', element: <ReviewResult /> },
      { path: '/review/:challengeId', element: <p>Page Revue</p> },
    ],
    { initialEntries: ['/review/a1/result'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ReviewResult', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche la note, sa décomposition et la synthèse du juge', async () => {
    vi.mocked(challengesApi.get).mockResolvedValue(ATTEMPT)
    renderResult()

    expect(await screen.findByText('Note : 64 sur 100')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /Anomalies trouvées \(1\/2\) : 36 sur 60/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /Précision \(1 faux positif\)/ })).toBeInTheDocument()
    expect(screen.getByText('Une anomalie sur deux repérée.')).toBeInTheDocument()
    expect(screen.getByText('Bonne analyse')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour au tableau de bord/ })).toHaveAttribute('href', '/dashboard')
  })

  it('compare la remarque du joueur à l’anomalie trouvée et signale celle manquée', async () => {
    vi.mocked(challengesApi.get).mockResolvedValue(ATTEMPT)
    renderResult()

    const found = (await screen.findByRole('heading', { name: 'Point-virgule manquant' })).closest('article')!
    expect(within(found).getByText('Trouvée')).toBeInTheDocument()
    expect(within(found).getByText('Il manque un ;')).toBeInTheDocument()
    expect(within(found).getByText('Exact.')).toBeInTheDocument()

    const missed = screen.getByRole('heading', { name: 'Mauvaise variable retournée' }).closest('article')!
    expect(within(missed).getByText('Manquée')).toBeInTheDocument()
    expect(within(missed).getByText('Correctif I2')).toBeInTheDocument()
  })

  it('liste les remarques hors cible à part', async () => {
    vi.mocked(challengesApi.get).mockResolvedValue(ATTEMPT)
    renderResult()

    const section = (await screen.findByRole('heading', { name: 'Remarques hors cible' })).closest('section')!
    expect(within(section).getByText('Nom peu clair')).toBeInTheDocument()
    expect(within(section).getByText('Hors cible.')).toBeInTheDocument()
  })

  it('prévient quand le juge IA était indisponible', async () => {
    vi.mocked(challengesApi.get).mockResolvedValue({ ...ATTEMPT, judgedBy: 'heuristic' })
    renderResult()
    expect(await screen.findByText(/Le juge IA était indisponible/)).toBeInTheDocument()
  })

  it('renvoie vers la revue tant qu’elle n’est pas soumise', async () => {
    vi.mocked(challengesApi.get).mockResolvedValue({ ...ATTEMPT, status: 'in_progress' } as never)
    renderResult()
    expect(await screen.findByText('Page Revue')).toBeInTheDocument()
  })
})
