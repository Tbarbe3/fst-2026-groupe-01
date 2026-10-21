import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import DiffViewer, { type DiffLine } from './DiffViewer'

const LINES: DiffLine[] = [
  { type: 'hunk', code: '@@ -1,2 +1,2 @@' },
  { type: 'context', code: 'const a = 1', oldLineNumber: 1, newLineNumber: 1 },
  { type: 'delete', code: 'const b = 2', oldLineNumber: 2 },
  { type: 'add', code: 'const b = 3', newLineNumber: 2 },
]

describe('DiffViewer', () => {
  it('calcule les statistiques d’ajout et de suppression', () => {
    render(<DiffViewer filename="a.ts" lines={LINES} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.getByText('−1')).toBeInTheDocument()
  })

  // Exigence d'accessibilité : le sens d'une ligne ne doit pas reposer sur
  // la seule couleur de fond.
  it('double la couleur par un libellé textuel', () => {
    render(<DiffViewer filename="a.ts" lines={LINES} />)
    expect(screen.getByText(/Ligne ajoutée/)).toBeInTheDocument()
    expect(screen.getByText(/Ligne supprimée/)).toBeInTheDocument()
  })

  it('n’offre aucun bouton de commentaire en lecture seule', () => {
    render(<DiffViewer filename="a.ts" lines={LINES} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('rend commentables les seules lignes du nouveau fichier', async () => {
    const onCommentLine = vi.fn()
    render(<DiffViewer filename="a.ts" lines={LINES} onCommentLine={onCommentLine} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Commenter la ligne 2 de a.ts' }))
    expect(onCommentLine).toHaveBeenCalledWith(LINES[3])
  })

  it('ouvre un commentaire au clic sur le code de la ligne', async () => {
    const onCommentLine = vi.fn()
    render(<DiffViewer filename="a.ts" lines={LINES} onCommentLine={onCommentLine} />)

    await userEvent.click(screen.getByText('const b = 3'))
    expect(onCommentLine).toHaveBeenCalledTimes(1)
    expect(onCommentLine).toHaveBeenCalledWith(LINES[3])
  })

  it('ignore le clic sur une ligne supprimée', async () => {
    const onCommentLine = vi.fn()
    render(<DiffViewer filename="a.ts" lines={LINES} onCommentLine={onCommentLine} />)

    await userEvent.click(screen.getByText('const b = 2'))
    expect(onCommentLine).not.toHaveBeenCalled()
  })
})
