'use client'

import { useMemo } from 'react'
import type { Level } from '../shared/useLevels'
import { curvePaths, resample, xAt, yAt } from '../shared/chart'
import { euro, num } from '../shared/format'
import { countLabel } from './copy'
import { useWidth } from './useWidth'
import s from './Grafico.module.css'

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ')

type Side = 'left' | 'right'

interface LabelRequest {
  id: string
  /** x of the line the label belongs to */
  anchor: number
  /** estimated text width */
  width: number
  sides: Side[]
}

interface PlacedLabel {
  id: string
  anchor: number
  side: Side
  row: number
  x1: number
  x2: number
}

const GAP = 7
const ROW = 18

// Top-band labels ("Tú", "Mediana", "Creías") sit beside their line, on the
// preferred side, and drop a row when they would collide with a label or cross
// another label's line.
function placeLabels(requests: LabelRequest[], width: number, rows = 3): Record<string, PlacedLabel> {
  const placed: PlacedLabel[] = []
  for (const r of requests) {
    let chosen: PlacedLabel | null = null
    for (let row = 0; row < rows && !chosen; row++) {
      for (const side of r.sides) {
        const x1 = side === 'right' ? r.anchor + GAP : r.anchor - GAP - r.width
        const x2 = x1 + r.width
        if (x1 < 0 || x2 > width) continue
        const clash = placed.some(
          (p) =>
            (p.row === row && x1 < p.x2 + 12 && x2 > p.x1 - 12) ||
            // a label higher up has its line running down through this row
            (p.row <= row && p.anchor > x1 - 5 && p.anchor < x2 + 5) ||
            // this label's line would run down through a label below it
            (p.row > row && r.anchor > p.x1 - 5 && r.anchor < p.x2 + 5)
        )
        if (!clash) {
          chosen = { id: r.id, anchor: r.anchor, side, row, x1, x2 }
          break
        }
      }
    }
    if (!chosen) {
      const x1 = Math.max(0, Math.min(width - r.width, r.anchor - r.width / 2))
      chosen = { id: r.id, anchor: r.anchor, side: 'right', row: rows - 1, x1, x2: x1 + r.width }
    }
    placed.push(chosen)
  }
  return Object.fromEntries(placed.map((p) => [p.id, p]))
}

/** CSS position of a label placed beside its line (right side: from the left; left side: from the right). */
function beside(p: PlacedLabel, width: number, top: number) {
  return p.side === 'right'
    ? { left: p.anchor + GAP, top }
    : { right: width - (p.anchor - GAP), top }
}

interface GraficoProps {
  level: Level
  /** the household's income per consumption unit */
  income: number
  /** the percentile the reader guessed */
  guess: number
  /** income at that percentile */
  guessValue: number | null
  xmax: number
}

// The main chart: the national distribution, annotated like a newspaper
// graphic. Hand-built SVG; the labels are HTML laid over it.
export default function Grafico({ level, income, guess, guessValue, xmax }: GraficoProps) {
  const [ref, measured] = useWidth<HTMLDivElement>(860)
  const W = Math.max(260, measured)
  const compact = W < 520
  const T = compact ? 26 : 30 // headroom above the plot for the top labels
  const H = compact ? 196 : Math.round(Math.min(360, Math.max(260, W * 0.42)))
  const h = H - T
  const samples = Math.round(Math.min(241, Math.max(91, W / 4)))
  const hasCurve = level.density.length > 1

  const values = useMemo(
    () => (hasCurve ? resample(level.density, xmax, samples) : new Array<number>(samples).fill(0)),
    [hasCurve, level.density, xmax, samples]
  )
  const over = income > xmax
  const splitAt = Math.min(income, xmax)
  const paths = useMemo(() => curvePaths(values, W, h, { split: splitAt, xmax }), [values, W, h, splitAt, xmax])

  const p = level.percentile
  const ux = xAt(income, W, xmax)
  const uy = yAt(values, splitAt, h, { xmax })
  const mx = xAt(level.median, W, xmax)
  const my = yAt(values, level.median, h, { xmax })
  const gx = guessValue !== null ? xAt(guessValue, W, xmax) : null
  const gy = guessValue !== null ? yAt(values, guessValue, h, { xmax }) : null

  const userText = `Tú · ${euro(income)}${over ? ' →' : ''}`
  const medianText = `Mediana · ${euro(level.median)}`
  const guessShort = `Creías: ${guess}`
  const guessLong = guessValue !== null ? `Donde creías estar: ${guess}, unos ${euro(guessValue)}` : ''

  // ---- "86 de cada 100 personas", inside the dark area -------------------
  let count: { x: number } | null = null
  if (!compact && hasCurve) {
    const label = countLabel(p)
    const w = label.length * 7
    const step = W / (values.length - 1)
    const tall = values.map((v, i) => ({ x: i * step, ok: v * 0.92 * h > 46 }))
    const firstTall = tall.find((t) => t.ok)?.x ?? W
    const lastTall = [...tall].reverse().find((t) => t.ok)?.x ?? 0
    let lo = firstTall + 8
    let hi = Math.min(lastTall, ux) - 10
    const segments: Array<[number, number]> = []
    if (gx !== null && gx > lo && gx < hi) {
      segments.push([lo, gx - 8], [gx + 8, hi])
    } else {
      segments.push([lo, hi])
    }
    const fit = segments.filter(([a, b]) => b - a >= w).sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0]
    if (fit) {
      lo = fit[0]
      hi = fit[1]
      count = { x: (lo + hi) / 2 }
    }
  }

  // ---- the long guess label, beside the dashed line ----------------------
  // It sits wholly under the curve (inside the area, as in a printed
  // graphic) or wholly above it, never across the line. Otherwise the short
  // label goes in the top band.
  const GUESS_W = 150
  const GUESS_H = 42
  const curveRange = (x1: number, x2: number) => {
    let highest = Infinity
    let lowest = -Infinity
    for (let x = x1; x <= x2 + 0.1; x += 3) {
      const y = yAt(values, (x / W) * xmax, h, { xmax })
      highest = Math.min(highest, y)
      lowest = Math.max(lowest, y)
    }
    return { highest, lowest }
  }
  let guessBox: { side: Side; top: number } | null = null
  if (!compact && gx !== null && gy !== null) {
    const sides: Side[] = gx <= ux ? ['left', 'right'] : ['right', 'left']
    const floor = count ? h - 72 : h - 14 // room for "86 de cada 100 personas" underneath
    const ceiling = -T + 2 * ROW + 6 // below the top band
    for (const side of sides) {
      const x1 = side === 'right' ? gx + 8 : gx - 8 - GUESS_W
      const x2 = x1 + GUESS_W
      const crossesYou = x1 < ux + 6 && x2 > ux - 6
      if (x1 < 0 || x2 > W || crossesYou) continue
      const { highest, lowest } = curveRange(x1, x2)
      const under = Math.max(lowest + 10, gy + 24)
      if (under + GUESS_H <= floor) {
        guessBox = { side, top: under }
        break
      }
      const above = highest - 10 - GUESS_H
      // the median's line rises from the curve to the top band
      const crossesMedian = !compact && mx > x1 - 5 && mx < x2 + 5
      if (above >= ceiling && !crossesMedian) {
        guessBox = { side, top: Math.min(above, gy - 10 - GUESS_H) }
        break
      }
    }
  }

  // ---- top band ----------------------------------------------------------
  const requests: LabelRequest[] = [
    {
      id: 'user',
      anchor: ux,
      width: userText.length * (compact ? 7.1 : 7.7),
      sides: over ? ['left'] : ['right', 'left'],
    },
  ]
  if (gx !== null && !guessBox) {
    requests.push({
      id: 'guess',
      anchor: gx,
      width: guessShort.length * (compact ? 6.3 : 6.8),
      sides: gx <= ux ? ['left', 'right'] : ['right', 'left'],
    })
  }
  if (!compact) {
    requests.push({
      id: 'median',
      anchor: mx,
      width: medianText.length * 6.7,
      sides: mx <= ux ? ['left', 'right'] : ['right', 'left'],
    })
  }
  const placed = placeLabels(requests, W)
  const rowTop = (id: string, nudge = 0) => (placed[id] ? placed[id].row * ROW + nudge : 0)

  // lines, in svg coordinates (the plot's top is y = 0; the headroom is negative)
  const userTop = rowTop('user') - T + 12
  const medianTop = rowTop('median', 2) - T + 20
  const guessTop =
    gy === null
      ? 0
      : guessBox
        ? Math.min(gy, guessBox.top)
        : rowTop('guess', compact ? 8 : 4) - T + 18

  // ---- axis --------------------------------------------------------------
  const tickCount = compact ? 2 : 6
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (i * xmax) / tickCount)
  const tickLabel = (v: number, i: number) =>
    i === 0 ? '0 €' : compact || i === tickCount ? euro(v) : num(v)

  const description =
    `Gráfico del reparto de la población de España según la renta anual por unidad de consumo de su hogar. ` +
    `Tu hogar, con ${euro(income)}, está en el percentil ${p}` +
    (guessValue !== null ? `; creías estar en el ${guess}, que equivale a unos ${euro(guessValue)}` : '') +
    `. La mediana es de ${euro(level.median)}.`

  return (
    <div ref={ref} className={s.chart}>
      <div className={s.plot} style={{ height: H }}>
        <svg
          className={s.svg}
          width={W}
          height={H}
          viewBox={`0 ${-T} ${W} ${H}`}
          role="img"
          aria-label={description}
        >
          <path className={s.areaLight} d={paths.area} />
          <g className={s.darkGroup}>
            <path className={s.areaDark} d={paths.left} />
          </g>
          <path className={s.curve} d={paths.line} pathLength={1} />
          <line className={s.axis} x1={0} y1={h + 0.5} x2={W} y2={h + 0.5} />

          {!compact && placed.median && (
            <line className={s.medianLine} x1={mx} y1={my} x2={mx} y2={Math.min(my, medianTop)} />
          )}

          {gx !== null && gy !== null && (
            <line className={s.guessLine} x1={gx} y1={guessTop} x2={gx} y2={h} />
          )}

          <line className={s.userLine} x1={ux} y1={userTop} x2={ux} y2={h} />
          {!over && <circle className={s.userDot} cx={ux} cy={uy} r={compact ? 4.5 : 5} />}
        </svg>

        <div className={s.labels} aria-hidden="true">
          {placed.user && (
            <span className={cx(s.label, s.userLabel)} style={beside(placed.user, W, rowTop('user'))}>
              {userText}
            </span>
          )}
          {placed.median && (
            <span className={cx(s.label, s.medianLabel)} style={beside(placed.median, W, rowTop('median', 2))}>
              {medianText}
            </span>
          )}
          {placed.guess && (
            <span className={cx(s.label, s.guessShort)} style={beside(placed.guess, W, rowTop('guess', compact ? 8 : 4))}>
              {guessShort}
            </span>
          )}
          {guessBox && gx !== null && (
            <span
              className={cx(s.label, s.guessLong, guessBox.side === 'left' && s.guessLongLeft)}
              style={
                guessBox.side === 'right'
                  ? { left: gx + 8, top: guessBox.top + T }
                  : { right: W - (gx - 8), top: guessBox.top + T }
              }
            >
              {guessLong}
            </span>
          )}
          {count && (
            <span className={cx(s.label, s.countLabel)} style={{ left: count.x, top: h + T - 32 }}>
              {countLabel(p)}
            </span>
          )}
        </div>
      </div>

      <div className={s.ticks} aria-hidden="true">
        {ticks.map((v, i) => (
          <span
            key={v}
            className={cx(s.tick, i === 0 && s.tickFirst, i === tickCount && s.tickLast)}
            style={{ left: `${(v / xmax) * 100}%` }}
          >
            {tickLabel(v, i)}
          </span>
        ))}
      </div>
    </div>
  )
}
