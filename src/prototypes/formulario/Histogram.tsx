'use client'

import { useMemo, type CSSProperties } from 'react'
import type { Level } from '../shared/useLevels'
import { resample } from '../shared/chart'
import { euro, num } from '../shared/format'
import { percent } from './copy'
import { cx } from './ui'
import s from './Histogram.module.css'

const BARS = 90
/** the tallest bar's share of the plot's height (room for the label above) */
const TOP = 0.86

interface HistogramProps {
  level: Level
  /** the household's income per consumption unit */
  income: number
  /** "España", "la provincia de Madrid", "el municipio de Madrid" */
  place: string
  /** box 06 and the income it stands for (national only); null hides the marker */
  guess: { percentile: number; value: number } | null
}

/** 0…90.000 € by default; wider where a tenth of the people are richer than that. */
export function scaleFor(level: Level): number {
  return Math.max(90000, Math.ceil(level.percentiles[89] / 30000) * 30000)
}

// Anexo I: the distribution as ~90 printed bars. Bars below the household in
// ink, the household's bar in red, the rest in light green.
export default function Histogram({ level, income, place, guess }: HistogramProps) {
  const xmax = scaleFor(level)
  const heights = useMemo(() => {
    const v = resample(level.density, xmax, BARS + 1)
    const bars = v.slice(0, BARS).map((y, i) => (y + v[i + 1]) / 2)
    const top = Math.max(...bars) || 1
    return bars.map((b) => b / top)
  }, [level.density, xmax])

  const bin = xmax / BARS
  const over = income >= xmax
  const mine = over ? BARS - 1 : Math.max(0, Math.floor(income / bin))
  const mineAt = ((mine + 0.5) / BARS) * 100
  const labelOnLeft = over || mineAt > 62
  const mineHeight = heights[mine] * TOP
  const incomeText = euro(income)

  const minor = Array.from({ length: 10 }, (_, i) => (i / 9) * 100)
  const wideTicks = [0, 1, 2, 3].map((k) => (k * xmax) / 3)
  const narrowTicks = [0, 1, 2].map((k) => (k * xmax) / 2)
  const tickText = (v: number, i: number, n: number) => (i === 0 ? '0 €' : i === n - 1 ? `${num(v)} €` : num(v))

  const guessAt = guess ? Math.min(100, (guess.value / xmax) * 100) : null
  const guessOver = guess ? guess.value > xmax : false

  const description =
    `Histograma de la renta por unidad de consumo en ${place}, de 0 a ${num(xmax)} €. ` +
    `En tinta, la población con menos renta que su hogar (${percent(level.percentile)}); ` +
    `en rojo, su tramo (${incomeText}${over ? ', fuera de escala' : ''}); en verde claro, la población con más renta.` +
    (guess ? ` El triángulo marca su estimación, el percentil ${guess.percentile}: ${euro(guess.value)}.` : '')

  return (
    <figure className={s.figure}>
      <div className={s.plot} role="img" aria-label={description}>
        <div className={s.bars}>
          {heights.map((h, i) => (
            <span
              key={i}
              className={cx(s.bar, i < mine ? s.below : i === mine ? s.mine : s.above)}
              style={{ height: `${h * TOP * 100}%`, '--i': i } as CSSProperties}
            />
          ))}
        </div>
        <span
          className={cx(s.mineLabel, labelOnLeft && s.mineLabelLeft)}
          style={labelOnLeft ? { right: `${100 - mineAt}%` } : { left: `${mineAt}%` }}
          aria-hidden="true"
        >
          {labelOnLeft
            ? `su tramo: ${incomeText}${over ? ', fuera de escala' : ''} →`
            : `← su tramo: ${incomeText}`}
        </span>
        {mineHeight < 0.62 && (
          <span
            className={s.leader}
            style={{ left: `${mineAt}%`, bottom: `calc(${mineHeight * 100}% + 3px)` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className={s.axis} aria-hidden="true">
        {minor.map((x) => (
          <span key={x} className={s.minor} style={{ left: `${x}%` }} />
        ))}
        {wideTicks.map((v, i) => (
          <span key={`w${i}`} className={cx(s.tick, s.wideOnly, i === 0 && s.first, i === 3 && s.last)} style={{ left: `${(v / xmax) * 100}%` }}>
            {tickText(v, i, 4)}
          </span>
        ))}
        {narrowTicks.map((v, i) => (
          <span key={`n${i}`} className={cx(s.tick, s.narrowOnly, i === 0 && s.first, i === 2 && s.last)} style={{ left: `${(v / xmax) * 100}%` }}>
            {tickText(v, i, 3)}
          </span>
        ))}
        {guess && guessAt !== null && (
          <span
            className={cx(s.guess, guessAt > 68 && s.guessLeft)}
            style={guessAt > 68 ? { right: `${100 - guessAt}%` } : { left: `${guessAt}%` }}
          >
            <svg className={s.triangle} width="10" height="8" viewBox="0 0 10 8" focusable="false">
              <path d="M5 0l5 8H0z" />
            </svg>
            06 · su estimación{guessOver ? ' →' : ''}
          </span>
        )}
      </div>

      <figcaption className={s.legend}>
        <span className={s.key}>
          <span className={cx(s.swatch, s.swatchInk)} aria-hidden="true" />
          Población con menos renta que su hogar: {percent(level.percentile)}
        </span>
        <span className={s.key}>
          <span className={cx(s.swatch, s.swatchRed)} aria-hidden="true" />
          Su tramo
        </span>
        {guess && (
          <span className={s.key}>
            <svg className={s.keyTriangle} width="10" height="8" viewBox="0 0 10 8" aria-hidden="true" focusable="false">
              <path d="M5 0l5 8H0z" />
            </svg>
            Su estimación (casilla 06)
          </span>
        )}
      </figcaption>
    </figure>
  )
}
