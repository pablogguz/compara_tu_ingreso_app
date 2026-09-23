// Geometry of Figure 2: the hundred squares as a 10 × 10 grid and as a unit
// histogram of 5.000 € bins, and the density curves drawn over it at the same
// scale (one square = 1 % of the population, so a curve normalised to ∫ = 1
// stands `y × 100 × 5.000` squares tall).

import { resample } from '@/prototypes/shared/chart'
import { BIN, BINS, XMAX } from './copy'

/** samples of every curve over 0…XMAX (one every 500 €) */
export const SAMPLES = 181

/** vertical room of the histogram, in squares (the national peak is ~20) */
const CAPACITY = 24
/** the tallest a curve may stand, in squares, before the figure scales it down */
export const MAX_PEAK = 21
/** room under the baseline for the axis */
export const AXIS = 50

export interface Box {
  width: number
  height: number
}

export interface Grid {
  cell: number
  /** side of a square */
  size: number
  x0: number
  y0: number
  side: number
}

export interface Hist {
  left: number
  plotW: number
  baseline: number
  binW: number
  unitH: number
  sqW: number
  sqH: number
  gap: number
}

export function gridGeometry({ width, height }: Box, compact: boolean): Grid {
  const side = Math.max(120, Math.min(width * (compact ? 0.82 : 0.8), height - (compact ? 56 : 90), compact ? 330 : 430))
  const cell = side / 10
  const gap = Math.max(2, cell * 0.14)
  return {
    cell,
    size: cell - gap,
    x0: (width - side) / 2 + gap / 2,
    y0: Math.max(24, (height - side) / 2) + gap / 2,
    side,
  }
}

export function histGeometry({ width, height }: Box, compact: boolean): Hist {
  const pad = compact ? 2 : 8
  const plotH = Math.max(80, height - AXIS)
  const unitFromHeight = plotH / CAPACITY
  const binFromWidth = (width - 2 * pad) / BINS
  // square cells where possible; on narrow screens a cell may be up to a
  // third wider than tall, so the histogram still fills the width
  const unitH = Math.min(unitFromHeight, binFromWidth)
  const binW = Math.min(binFromWidth, unitH * (compact ? 1.34 : 1.12))
  const plotW = binW * BINS
  const gap = Math.max(1.5, Math.min(binW, unitH) * 0.13)
  return {
    left: (width - plotW) / 2,
    plotW,
    baseline: plotH,
    binW,
    unitH,
    sqW: binW - gap,
    sqH: unitH - gap,
    gap,
  }
}

export interface SquarePos {
  x: number
  y: number
  /** scale against the grid square (the element's own size) */
  sx: number
  sy: number
}

/** Square k (1…100) in reading order: 1 = top-left, 100 = bottom-right. */
export function gridPositions(g: Grid): SquarePos[] {
  return Array.from({ length: 100 }, (_, i) => ({
    x: g.x0 + (i % 10) * g.cell,
    y: g.y0 + Math.floor(i / 10) * g.cell,
    sx: 1,
    sy: 1,
  }))
}

/**
 * How many of the hundred live in households with less income than yours: the
 * number of percentiles at or below your income (0 below the 1st, 99 above
 * the 99th). That many squares are "below"; yours is the next one, square
 * below + 1, and the rest (99 − below) are above.
 */
export function peopleBelow(income: number, percentiles: number[]): number {
  let n = 0
  for (const v of percentiles) if (v <= income) n++
  return Math.min(99, n)
}

/**
 * The income each square stands for. Square k is the 1 % band between
 * percentiles k − 1 and k; it carries the income at percentile k (the 100th
 * sits above the 99th). Your square carries your own income.
 */
export function squareIncomes(percentiles: number[], yourSquare: number, yourIncome: number): number[] {
  return Array.from({ length: 100 }, (_, i) => {
    const k = i + 1
    if (k === yourSquare) return yourIncome
    if (k <= 99) return percentiles[k - 1]
    return Math.max(percentiles[98] * 1.1, XMAX)
  })
}

export const binOf = (value: number) => Math.max(0, Math.min(BINS - 1, Math.floor(value / BIN)))

/** Stack each square in its 5.000 € bin, from the baseline up, in order. */
export function histPositions(h: Hist, incomes: number[], grid: Grid): SquarePos[] {
  const heights = new Array(BINS).fill(0)
  return incomes.map((v) => {
    const b = binOf(v)
    const j = heights[b]++
    return {
      x: h.left + b * h.binW + h.gap / 2,
      y: h.baseline - (j + 1) * h.unitH + h.gap / 2,
      sx: h.sqW / grid.size,
      sy: h.sqH / grid.size,
    }
  })
}

/** How many squares each bin holds. */
export function binCounts(incomes: number[]): number[] {
  const counts = new Array(BINS).fill(0)
  for (const v of incomes) counts[binOf(v)]++
  return counts
}

/**
 * A density curve in squares: normalised so ∫ y dx = 1 over its own grid,
 * sampled every 500 € over 0…XMAX, times 100 people × 5.000 € per bin.
 */
export function curveInSquares(density: Array<{ x: number; y: number }>): number[] {
  let area = 0
  for (let i = 1; i < density.length; i++) {
    area += ((density[i].x - density[i - 1].x) * (density[i].y + density[i - 1].y)) / 2
  }
  const raw = resample(density, XMAX, SAMPLES, 1)
  return raw.map((v) => (area > 0 ? (v / area) * 100 * BIN : 0))
}

export const peakOf = (values: number[]) => values.reduce((m, v) => Math.max(m, v), 0)

/** x in px of an income on the histogram (clamped to the plot). */
export function xOf(h: Hist, value: number): number {
  return h.left + Math.max(0, Math.min(1, value / XMAX)) * h.plotW
}

/** Sample points of a curve (in squares) in px. */
export function curvePoints(h: Hist, values: number[], scale: number): Array<[number, number]> {
  const n = values.length - 1
  return values.map((v, i) => [h.left + (i / n) * h.plotW, h.baseline - v * h.unitH * scale])
}

/** Height of a curve (in px from the top) at an income. */
export function curveYAt(h: Hist, values: number[], value: number, scale: number): number {
  const f = Math.max(0, Math.min(1, value / XMAX)) * (values.length - 1)
  const lo = Math.floor(f)
  const hi = Math.min(values.length - 1, lo + 1)
  const v = values[lo] + (values[hi] - values[lo]) * (f - lo)
  return h.baseline - v * h.unitH * scale
}

// ---- labels above the plot --------------------------------------------------

export interface LabelRequest {
  id: string
  /** x of the line the label belongs to */
  x: number
  /** estimated width of the text */
  width: number
}

export interface PlacedLabel {
  id: string
  x: number
  row: number
  /** left edge of the text */
  left: number
  /** the text sits to the right of its line */
  right: boolean
}

/**
 * Put each label beside its line (right if it fits, else left), one row down
 * when it would touch a label or another label's line. Rows count from the
 * top of the plot.
 */
export function placeLabels(requests: LabelRequest[], minX: number, maxX: number, rows = 3): PlacedLabel[] {
  const GAP = 6
  const placed: PlacedLabel[] = []
  for (const r of requests) {
    let found: PlacedLabel | null = null
    for (let row = 0; row < rows && !found; row++) {
      for (const right of [true, false]) {
        const left = right ? r.x + GAP : r.x - GAP - r.width
        const end = left + r.width
        if (left < minX - 2 || end > maxX + 2) continue
        const clash = placed.some(
          (p) =>
            (p.row === row && left < p.left + widthOf(p, requests) + 10 && end > p.left - 10) ||
            // a label above this one has its line running down through this row
            (p.row < row && p.x > left - 4 && p.x < end + 4) ||
            // this label's line would run down through a label below it
            (p.row > row && r.x > p.left - 4 && r.x < p.left + widthOf(p, requests) + 4)
        )
        if (!clash) {
          found = { id: r.id, x: r.x, row, left, right }
          break
        }
      }
    }
    if (!found) {
      const left = Math.max(minX, Math.min(maxX - r.width, r.x - r.width / 2))
      found = { id: r.id, x: r.x, row: rows - 1, left, right: true }
    }
    placed.push(found)
  }
  return placed
}

function widthOf(p: PlacedLabel, requests: LabelRequest[]): number {
  return requests.find((r) => r.id === p.id)?.width ?? 0
}

/** A rough width for a short Hanken Grotesk label at `size` px. */
export const textWidth = (text: string, size = 12) => Math.ceil(text.length * size * 0.56) + 4

/** Round euro ticks for the axis. */
export function axisTicks(compact: boolean): number[] {
  const step = compact ? 20000 : 10000
  const out: number[] = []
  for (let v = 0; v <= (compact ? 60000 : 80000); v += step) out.push(v)
  return out
}
