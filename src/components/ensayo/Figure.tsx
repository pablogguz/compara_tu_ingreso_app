'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from '@/hooks/useLevels'
import { smoothPath } from '@/lib/chartGeometry'
import { euro, num } from '@/lib/format'
import { XMAX, cx, levelTitle } from './copy'
import {
  MAX_PEAK,
  curveInSquares,
  curvePoints,
  curveYAt,
  gridGeometry,
  gridPositions,
  histGeometry,
  histPositions,
  peakOf,
  placeLabels,
  squareIncomes,
  textWidth,
  xOf,
  type Grid,
  type Hist,
  type SquarePos,
} from './geometry'
import { useCount, useSize, useTweenedArray } from './hooks'
import s from './Figure.module.css'

export type StepKey = 'people' | 'order' | 'guess' | 'you' | 'hist' | 'curve' | 'lines' | 'province' | 'municipality'

export const STEP_KEYS: StepKey[] = ['people', 'order', 'guess', 'you', 'hist', 'curve', 'lines', 'province', 'municipality']

interface FigState {
  hist: boolean
  colour: 'grey' | 'ramp' | 'split'
  /** the dashed outline on the guessed square */
  guess: boolean
  /** opacity of the squares, and of yours */
  squares: number
  mine: number
  /** which level's curve (0 national, 1 provincial, 2 municipal), if any */
  level: 0 | 1 | 2 | null
  median: boolean
  /** your line and the shaded area to its left */
  you: boolean
  guessLine: boolean
  /** Spain's curve as a thin reference line */
  ghost: boolean
}

const base: FigState = {
  hist: false,
  colour: 'grey',
  guess: false,
  squares: 1,
  mine: 1,
  level: null,
  median: false,
  you: false,
  guessLine: false,
  ghost: false,
}

const STATES: Record<StepKey, FigState> = {
  people: base,
  order: { ...base, colour: 'ramp' },
  guess: { ...base, guess: true },
  you: { ...base, colour: 'split', guess: true },
  hist: { ...base, hist: true, colour: 'split', guess: true },
  curve: { ...base, hist: true, colour: 'split', guess: true, squares: 0.22, mine: 0.95, level: 0, median: true },
  lines: { ...base, hist: true, colour: 'split', guess: true, squares: 0.14, mine: 0.4, level: 0, you: true, guessLine: true },
  province: { ...base, hist: true, colour: 'split', squares: 0, mine: 0, level: 1, you: true, guessLine: true, ghost: true },
  municipality: { ...base, hist: true, colour: 'split', squares: 0, mine: 0, level: 2, median: true, you: true, guessLine: true, ghost: true },
}

/** A light-to-dark grey-blue, for square k of 100. */
function ramp(k: number): string {
  const from = [0xe2, 0xe6, 0xec]
  const to = [0x3f, 0x4c, 0x63]
  const t = (k - 1) / 99
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

interface FigureProps {
  step: StepKey
  levels: Level[]
  /** your national percentile, 1…99 (what the readout shows) */
  you: number
  /** how many of the hundred are below you: that many dark squares, yours is the next */
  below: number
  /** the guess, 1…99 people below: its square is guess + 1 */
  guess: number
  income: number
  guessValue: number
  reduced: boolean
  compact: boolean
  /** "Figura 2" */
  number: string
}

export default function Figure({ step, levels, you, below, guess, income, guessValue, reduced, compact, number }: FigureProps) {
  const st = STATES[step]
  const [stageRef, box] = useSize<HTMLDivElement>({ width: 640, height: 520 })
  const grid = useMemo(() => gridGeometry(box, compact), [box, compact])
  const hist = useMemo(() => histGeometry(box, compact), [box, compact])
  const mine = below + 1
  const incomes = useMemo(() => squareIncomes(levels[0].percentiles, mine, income), [levels, mine, income])
  const gridPos = useMemo(() => gridPositions(grid), [grid])
  const histPos = useMemo(() => histPositions(hist, incomes, grid), [hist, incomes, grid])
  const level = levels[st.level ?? 0]

  // transitions only once the stage has its real size
  const [live, setLive] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setLive(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const counting = step === 'you'
  const youCount = useCount(you, counting, 500 + you * 6, reduced)
  const shownYou = counting ? youCount : you

  let readout: React.ReactNode = null
  if (step === 'guess') {
    readout = <Read kind="guess" label="Tu predicción" value={String(guess)} />
  } else if (step === 'you' || step === 'hist' || step === 'lines') {
    readout = (
      <>
        <Read kind="guess" label="Tu predicción" value={String(guess)} />
        <Read kind="you" label="Tu posición" value={String(shownYou)} />
      </>
    )
  } else if (step === 'province' || step === 'municipality') {
    readout = (
      <>
        <Read kind="plain" label="España" value={String(you)} />
        <Read kind="you" label={step === 'province' ? 'Provincia' : 'Municipio'} value={String(level.percentile)} />
      </>
    )
  }

  return (
    <figure className={s.figure} aria-labelledby="ensayo-fig2-caption">
      <div className={s.head}>
        <p className={s.caption} id="ensayo-fig2-caption">
          <span className={s.figNum}>{number}</span>
          <span className={s.captionText} key={step}>
            {captionFor(step, levels)}
          </span>
        </p>
        <div className={s.readout} aria-hidden="true">
          {readout}
        </div>
      </div>

      <div ref={stageRef} className={s.stage} aria-hidden="true">
        <Squares
          positions={st.hist ? histPos : gridPos}
          grid={grid}
          st={st}
          mine={mine}
          guessSquare={guess + 1}
          live={live}
          layoutKey={reduced ? (st.hist ? 'h' : 'g') : 'all'}
        />

        {/* 1 · menos ingresos … más ingresos · 100 */}
        <span
          className={cx(s.gridLabel, !st.hist && step !== 'people' && s.on)}
          style={{ left: grid.x0 - 1, top: grid.y0 - 24 }}
        >
          Menos ingresos
        </span>
        <span
          className={cx(s.gridLabel, s.gridLabelEnd, !st.hist && step !== 'people' && s.on)}
          style={{ right: box.width - (grid.x0 + 9 * grid.cell + grid.size) - 1, top: grid.y0 + 10 * grid.cell + 2 }}
        >
          Más ingresos
        </span>

        <Plot hist={hist} st={st} levels={levels} income={income} guessValue={guessValue} reduced={reduced} compact={compact} />
      </div>

      <p className={cx(s.key, st.ghost && s.on)} aria-hidden="true">
        <span className={s.keyItem}>
          <span className={s.keyLine} />
          {compact ? (level.key === 'municipal' ? 'Tu municipio' : 'Tu provincia') : levelTitle(level.key, level.place)}
        </span>
        <span className={s.keyItem}>
          <span className={s.keyGhost} />
          España
        </span>
      </p>
    </figure>
  )
}

function Read({ kind, label, value }: { kind: 'guess' | 'you' | 'plain'; label: string; value: string }) {
  return (
    <span className={s.read}>
      <span className={s.readLabel}>
        {kind !== 'plain' && <span className={cx(s.readMark, kind === 'guess' ? s.readGuess : s.readYou)} />}
        {label}
      </span>
      <span className={cx(s.readValue, kind === 'you' && s.readValueYou, kind === 'guess' && s.readValueGuess)}>
        {value}
      </span>
    </span>
  )
}

/** "Mediana de España: 20.234 €", "Mediana de la provincia de Madrid: …",
 *  "Mediana de Aranjuez: …"; on phones a long place becomes "tu provincia". */
function medianLabel(level: Level, compact: boolean): string {
  const value = euro(level.median)
  const place =
    level.key === 'national' ? 'España' : level.key === 'provincial' ? `la provincia de ${level.place}` : level.place
  const text = `Mediana de ${place}: ${value}`
  if (!compact || text.length <= 34 || level.key === 'national') return text
  return `Mediana de ${level.key === 'provincial' ? 'tu provincia' : 'tu municipio'}: ${value}`
}

function captionFor(step: StepKey, levels: Level[]): string {
  switch (step) {
    case 'people':
      return 'España, en cien personas'
    case 'order':
      return 'Ordenadas según sus ingresos'
    case 'guess':
      return 'Dónde creías estar'
    case 'you':
      return 'Dónde estás'
    case 'hist':
      return 'Las cien personas, según su renta'
    case 'curve':
      return 'La distribución de la renta en España'
    case 'lines':
      return 'Tu predicción y tu renta'
    case 'province':
      return `Provincia de ${levels[1].place}`
    case 'municipality':
      return `Municipio de ${levels[2].place}`
  }
}

// ---- the hundred squares ----------------------------------------------------

interface SquaresProps {
  positions: SquarePos[]
  grid: Grid
  st: FigState
  /** your square, 1…100 */
  mine: number
  /** the guessed square, 2…100 */
  guessSquare: number
  live: boolean
  /** under reduced motion, a new key per layout cross-fades instead of flying */
  layoutKey: string
}

const Squares = memo(function Squares({ positions, grid, st, mine, guessSquare, live, layoutKey }: SquaresProps) {
  return (
    <div className={cx(s.squares, live && s.live)} key={layoutKey}>
      {positions.map((p, i) => {
        const k = i + 1
        const yours = k === mine
        const colour =
          st.colour === 'grey'
            ? s.sqAbove
            : st.colour === 'ramp'
              ? s.sqRamp
              : k < mine
                ? s.sqBelow
                : yours
                  ? s.sqYou
                  : s.sqAbove
        return (
          <span
            key={k}
            className={cx(s.sq, colour, st.guess && k === guessSquare && s.sqGuess)}
            style={
              {
                width: grid.size,
                height: grid.size,
                transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${p.sx.toFixed(4)}, ${p.sy.toFixed(4)})`,
                opacity: yours && st.colour === 'split' ? st.mine : st.squares,
                '--i': i,
                '--ramp': ramp(k),
                '--inv': (1 / Math.min(p.sx, p.sy)).toFixed(3),
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
})

// ---- curves, lines, labels and the axis -------------------------------------

interface PlotProps {
  hist: Hist
  st: FigState
  levels: Level[]
  income: number
  guessValue: number
  reduced: boolean
  compact: boolean
}

function Plot({ hist, st, levels, income, guessValue, reduced, compact }: PlotProps) {
  const curves = useMemo(() => levels.map((l) => curveInSquares(l.density)), [levels])
  const idx = st.level ?? 0
  const peak = Math.max(peakOf(curves[idx]), st.ghost ? peakOf(curves[0]) : 0)
  const scale = Math.min(1, MAX_PEAK / Math.max(peak, 1e-9))
  const target = useMemo(() => curves[idx].map((v) => v * scale), [curves, idx, scale])
  const ghostTarget = useMemo(() => curves[0].map((v) => v * scale), [curves, scale])
  const main = useTweenedArray(target, 950, reduced)
  const ghost = useTweenedArray(ghostTarget, 950, reduced)

  const level = levels[idx]
  const b = hist.baseline
  const right = hist.left + hist.plotW
  const top = Math.max(2, b - 24 * hist.unitH)
  const ROW = compact ? 17 : 19

  const pts = curvePoints(hist, main, 1)
  const line = smoothPath(pts)
  const area = `${line}L${pts[pts.length - 1][0]} ${b}L${pts[0][0]} ${b}Z`
  const beyond = income > XMAX
  const ux = xOf(hist, income)
  const uy = curveYAt(hist, main, income, 1)
  const leftPts = [...pts.filter((p) => p[0] < ux), [ux, uy] as [number, number]]
  const leftArea = `${smoothPath(leftPts)}L${ux} ${b}L${pts[0][0]} ${b}Z`
  const ghostLine = smoothPath(curvePoints(hist, ghost, 1))
  const gx = xOf(hist, guessValue)
  const mx = xOf(hist, level.median)

  // labels over the plot, placed left to right
  const size = compact ? 11.5 : 12.5
  const wanted = [
    { id: 'median', x: mx, text: medianLabel(level, compact), on: st.median },
    { id: 'guess', x: gx, text: `Tu predicción: ${euro(guessValue)}`, on: st.guessLine },
    { id: 'you', x: ux, text: beyond ? `Tu hogar: ${euro(income)} →` : `Tu hogar: ${euro(income)}`, on: st.you },
  ]
  const active = wanted.filter((w) => w.on).sort((p, q) => p.x - q.x)
  const placed = placeLabels(
    active.map((w) => ({ id: w.id, x: w.x, width: textWidth(w.text, size) })),
    hist.left,
    right
  )
  // where each label last stood, so a label fades out in place
  const last = useRef<Record<string, { left: number; row: number }>>({})
  for (const p of placed) last.current[p.id] = { left: p.left, row: p.row }
  const spot = (id: string, x: number) => last.current[id] ?? { left: Math.max(hist.left, x + 6), row: 0 }
  const rowY = (id: string, x: number) => top + spot(id, x).row * ROW

  const ticks = [0, 20000, 40000, 60000]
  const minor = [10000, 30000, 50000, 70000, 80000]

  return (
    <>
      <svg className={cx(s.svg, s.back)} width="100%" height="100%" aria-hidden="true" focusable="false">
        <path d={area} className={cx(s.area, st.level !== null && s.on)} />
        <path d={leftArea} className={cx(s.areaLeft, st.you && s.on)} />
      </svg>

      <svg className={cx(s.svg, s.front)} width="100%" height="100%" aria-hidden="true" focusable="false">
        <path d={ghostLine} className={cx(s.ghost, st.ghost && s.on)} />
        <path d={line} pathLength={1} className={cx(s.curve, st.level !== null && s.drawn)} />

        <line x1={mx} x2={mx} y1={b} y2={rowY('median', mx) + 4} className={cx(s.medianLine, st.median && s.on)} />
        <line x1={gx} x2={gx} y1={b} y2={rowY('guess', gx) + 4} className={cx(s.guessLine, st.guessLine && s.on)} />
        <line x1={ux} x2={ux} y1={b} y2={rowY('you', ux) + 4} className={cx(s.youLine, st.you && s.on)} />
        {!beyond && <circle cx={ux} cy={uy} r={4.5} className={cx(s.youDot, st.you && s.on)} />}

        <g className={cx(s.axis, st.hist && s.on)}>
          <line x1={hist.left} x2={right} y1={b + 0.5} y2={b + 0.5} className={s.axisLine} />
          {[...ticks, ...minor].map((v) => (
            <line key={v} x1={xOf(hist, v)} x2={xOf(hist, v)} y1={b} y2={b + (ticks.includes(v) ? 6 : 4)} className={s.tick} />
          ))}
          <line x1={right - 0.5} x2={right - 0.5} y1={b} y2={b + 6} className={s.tick} />
        </g>
      </svg>

      <div className={cx(s.axisLabels, st.hist && s.on)}>
        {ticks.map((v) => (
          <span key={v} className={cx(s.tickLabel, v === 0 && s.tickFirst)} style={{ left: xOf(hist, v), top: b + 9 }}>
            {v === 0 ? '0 €' : `${num(v)} €`}
          </span>
        ))}
        <span
          className={cx(s.tickLabel, s.tickLast, st.squares > 0 && s.on)}
          style={{ right: `calc(100% - ${right}px)`, top: b + 9 }}
        >
          85.000 € o más
        </span>
        <span
          className={cx(s.tickLabel, s.tickLast, st.squares === 0 && s.on)}
          style={{ right: `calc(100% - ${right}px)`, top: b + 9 }}
        >
          {num(XMAX)} €
        </span>
        <span className={s.axisTitle} style={{ left: hist.left, top: b + 29 }}>
          Renta neta al año por unidad de consumo
        </span>
      </div>

      {wanted.map((w) => {
        const p = spot(w.id, w.x)
        return (
          <span
            key={w.id}
            className={cx(
              s.lineLabel,
              w.id === 'you' && s.lineLabelYou,
              w.id === 'guess' && s.lineLabelGuess,
              w.on && s.on
            )}
            style={{ transform: `translate(${p.left.toFixed(1)}px, ${(top + p.row * ROW - 4).toFixed(1)}px)` }}
          >
            {w.text}
          </span>
        )
      })}
    </>
  )
}
