import { useState, type KeyboardEvent, type PointerEvent } from 'react'

import { useI18n } from '@/i18n'

export interface ScorePoint {
  label: string
  score: number
}

const WIDTH = 400
const HEIGHT = 200
const PAD = { top: 12, right: 14, bottom: 28, left: 34 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom
const Y_TICKS = [0, 50, 100]

const x = (i: number, n: number) => PAD.left + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W)
const y = (score: number) => PAD.top + PLOT_H - (score / 100) * PLOT_H

/** Courbe des notes (0 à 100) : survol ou flèches du clavier pour lire une valeur. */
export default function ScoreChart({ points, title }: { points: ScorePoint[]; title: string }) {
  const { t } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const n = points.length
  const coords = points.map((p, i) => ({ ...p, cx: x(i, n), cy: y(p.score) }))
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx},${c.cy}`).join(' ')
  const area = `${line} L${coords[n - 1]!.cx},${y(0)} L${coords[0]!.cx},${y(0)} Z`
  // Trois étiquettes au plus sur l'axe des dates, pour qu'elles ne se chevauchent jamais.
  const labelled = new Set([0, Math.floor((n - 1) / 2), n - 1])

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * WIDTH
    const nearest = coords.reduce((best, c, i) => (Math.abs(c.cx - svgX) < Math.abs(coords[best]!.cx - svgX) ? i : best), 0)
    setActive(nearest)
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? (step > 0 ? -1 : n)) + step)))
  }

  const current = active === null ? null : coords[active]!

  return (
    <figure className="score-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={title}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((i) => i ?? n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line className="score-chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="score-chart-axis" x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        {coords.map((c, i) =>
          labelled.has(i) ? (
            <text key={i} className="score-chart-axis" x={c.cx} y={HEIGHT - 8} textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}>
              {c.label}
            </text>
          ) : null,
        )}
        <path className="score-chart-area" d={area} />
        <path className="score-chart-line" d={line} />
        {current && <line className="score-chart-crosshair" x1={current.cx} x2={current.cx} y1={PAD.top} y2={y(0)} />}
        {coords.map((c, i) => (
          <circle key={i} className="score-chart-dot" cx={c.cx} cy={c.cy} r={i === active ? 6 : 4} />
        ))}
      </svg>

      {current && (
        <div
          className="score-chart-tooltip"
          style={{ left: `${(current.cx / WIDTH) * 100}%`, top: `${(current.cy / HEIGHT) * 100}%` }}
          aria-live="polite"
        >
          <span>{current.label}</span>
          <strong>{current.score}/100</strong>
        </div>
      )}

      <table className="visually-hidden">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{t('dashboard.chartDate')}</th>
            <th scope="col">{t('dashboard.chartScore')}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{p.label}</td>
              <td>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
