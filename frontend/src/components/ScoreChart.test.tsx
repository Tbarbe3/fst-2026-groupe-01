import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import ScoreChart from './ScoreChart'

const POINTS = [
  { label: '2 oct.', score: 40 },
  { label: '9 oct.', score: 65 },
  { label: '16 oct.', score: 90 },
]

describe('ScoreChart', () => {
  it('se décrit et expose ses valeurs dans un tableau', () => {
    render(<ScoreChart points={POINTS} title="Évolution de la note" />)
    expect(screen.getByRole('img', { name: 'Évolution de la note' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Évolution de la note' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(POINTS.length + 1)
  })

  it('se lit au clavier, point par point', async () => {
    const user = userEvent.setup()
    render(<ScoreChart points={POINTS} title="Notes" />)

    await user.tab()
    expect(screen.getByText('90/100')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('65/100')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByText('40/100')).toBeInTheDocument()
  })

  it('cache l’info-bulle quand le pointeur quitte le graphique', () => {
    render(<ScoreChart points={POINTS} title="Notes" />)
    const chart = screen.getByRole('img')
    fireEvent.pointerMove(chart, { clientX: 0 })
    expect(screen.getByText('40/100')).toBeInTheDocument()
    fireEvent.pointerLeave(chart)
    expect(screen.queryByText('40/100')).not.toBeInTheDocument()
  })

  it('accepte une seule revue', () => {
    render(<ScoreChart points={[POINTS[0]!]} title="Notes" />)
    expect(screen.getAllByText('2 oct.').length).toBeGreaterThan(0)
  })
})
