// Geometry for hand-drawn SVG charts of the income distributions (no chart
// library): resample a density curve, then build smooth paths.

export type Point = [number, number]

/**
 * Sample a density curve at `samples` evenly spaced incomes from 0 to `xmax`,
 * normalised so the highest sample is 1. Pass `peak` to normalise against a
 * common height instead (e.g. to compare two curves on one scale).
 */
export function resample(
  density: Array<{ x: number; y: number }>,
  xmax: number,
  samples = 91,
  peak?: number
): number[] {
  const xs = density.map((d) => d.x)
  const ys = density.map((d) => d.y)
  const at = (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1]
    let lo = 0
    let hi = xs.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (xs[mid] <= x) lo = mid
      else hi = mid
    }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo])
    return ys[lo] + t * (ys[hi] - ys[lo])
  }
  const raw = Array.from({ length: samples }, (_, i) => at((i / (samples - 1)) * xmax))
  const top = peak ?? Math.max(...raw)
  return raw.map((v) => (top > 0 ? v / top : 0))
}

/** Smooth open path through the points (Catmull-Rom → cubic Bézier). */
export function smoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  const r = (n: number) => Math.round(n * 10) / 10
  let d = `M${r(points[0][0])} ${r(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    d +=
      `C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ` +
      `${r(p2[0])} ${r(p2[1])}`
  }
  return d
}

export interface CurvePaths {
  /** the curve itself */
  line: string
  /** the area under the whole curve */
  area: string
  /** the area under the curve from 0 up to `split` (empty without one) */
  left: string
  /** x of `split` */
  splitX: number | null
  /** y of the curve at `split` */
  splitY: number | null
}

/**
 * Paths for a curve drawn in a w × h box (y grows downwards, baseline at h).
 * `values` are the output of `resample` over 0…xmax; `top` leaves headroom
 * above the highest point (0.92 = the peak sits at 8% from the top).
 */
export function curvePaths(
  values: number[],
  w: number,
  h: number,
  options: { split?: number; xmax: number; top?: number }
): CurvePaths {
  const { split, xmax, top = 0.92 } = options
  const step = w / (values.length - 1)
  const pts: Point[] = values.map((v, i) => [i * step, h - v * top * h])
  const line = smoothPath(pts)
  const area = `${line}L${w} ${h}L0 ${h}Z`
  if (split === undefined) return { line, area, left: '', splitX: null, splitY: null }
  const sx = Math.max(0, Math.min(w, (split / xmax) * w))
  const sy = yAt(values, split, h, { xmax, top })
  const left = [...pts.filter((p) => p[0] < sx), [sx, sy] as Point]
  return { line, area, left: `${smoothPath(left)}L${sx} ${h}L0 ${h}Z`, splitX: sx, splitY: sy }
}

/** y of the curve at income `x`, in the same box as `curvePaths`. */
export function yAt(values: number[], x: number, h: number, options: { xmax: number; top?: number }): number {
  const { xmax, top = 0.92 } = options
  const f = Math.max(0, Math.min(1, x / xmax)) * (values.length - 1)
  const lo = Math.floor(f)
  const t = f - lo
  const v = values[lo] * (1 - t) + (values[Math.min(lo + 1, values.length - 1)] ?? 0) * t
  return h - v * top * h
}

/** x of income `v` in a box of width w spanning 0…xmax (clamped to the box). */
export function xAt(v: number, w: number, xmax: number): number {
  return Math.max(0, Math.min(w, (v / xmax) * w))
}

/** Round axis ticks: 0, 15.000, 30.000 … up to xmax. */
export function ticks(xmax: number, count = 6): number[] {
  const raw = xmax / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = 0; v <= xmax + 1e-6; v += step) out.push(Math.round(v))
  return out
}
