// Label placement for the line diagrams. Pure geometry, no DOM: given where
// the stops fall and how wide their labels are, decide which stations to show
// and how far to nudge each label so nothing overlaps the "you" dot, the
// guess or another label. A station whose labels cannot fit is dropped, as a
// real line map drops minor stops rather than print them on top of each other.

export interface Span {
  lo: number
  hi: number
}

const EPS = 1e-6

function clear(a: Span, b: Span, gap: number): boolean {
  return a.lo >= b.hi + gap - EPS || b.lo >= a.hi + gap - EPS
}

/**
 * The smallest shift that moves a label of size `w`, nominally centred on
 * `x`, clear of every obstacle and inside [min, max]. null when no shift up
 * to `maxShift` works.
 */
export function fit(
  x: number,
  w: number,
  obstacles: Span[],
  opts: { min: number; max: number; maxShift: number; gap?: number }
): number | null {
  const gap = opts.gap ?? 6
  const half = w / 2
  const candidates = new Set<number>([0, opts.min + half - x, opts.max - half - x])
  for (const o of obstacles) {
    candidates.add(o.hi + gap + half - x)
    candidates.add(o.lo - gap - half - x)
  }
  const ordered = Array.from(candidates).sort((a, b) => Math.abs(a) - Math.abs(b))
  for (const d of ordered) {
    if (Math.abs(d) > opts.maxShift + EPS) continue
    const span = { lo: x + d - half, hi: x + d + half }
    if (span.lo < opts.min - EPS || span.hi > opts.max + EPS) continue
    if (obstacles.every((o) => clear(span, o, gap))) return d
  }
  return null
}

const around = (x: number, r: number): Span => ({ lo: x - r, hi: x + r })

// Which stations survive first when space is short: the median, then the ends.
// Indices into the landmark order [P10, P25, Mediana, P75, P90, P99].
const PRIORITY = [2, 0, 4, 5, 1, 3]

/* ---------------------------------------------------------------- horizontal */

/** Geometry of the horizontal line (px); mirrors Lines.module.css. */
export const H = {
  /** the "you" dot incl. its yellow halo */
  userR: 21,
  stationR: 10,
  guessR: 12,
  /** dashed ring drawn around the dot when the guess sits under it */
  ringR: 28,
  /** labels may overhang the ends of the line by this much */
  overhang: 22,
}

export interface HStationPlacement {
  show: boolean
  nameShift: number
  valueShift: number
}

export interface HGuessPlacement {
  /** the guess is hidden under the dot: draw a ring around the dot instead */
  ring: boolean
  /** 'values' = right under the circle; 'below' = a row lower, with a leader */
  row: 'values' | 'below'
  shift: number
}

export interface HLayout {
  flagShift: number
  stations: HStationPlacement[]
  guess: HGuessPlacement | null
}

export interface HLayoutInput {
  width: number
  /** 1…99 */
  user: number
  guess?: number | null
  stations: Array<{ p: number; name: number; value: number }>
  /** label widths, px */
  flag: number
  guessLabel?: number
}

export function layoutHorizontal(input: HLayoutInput): HLayout {
  const W = Math.max(1, input.width)
  const X = (p: number) => ((Math.min(99, Math.max(1, p)) - 1) / 98) * W
  const bounds = { min: -H.overhang, max: W + H.overhang }
  const ux = X(input.user)
  const userBox = around(ux, H.userR + 2)

  const flagShift = fit(ux, input.flag, [], { ...bounds, maxShift: Infinity }) ?? 0

  const names: Span[] = [userBox]
  const values: Span[] = [userBox]
  const stations: HStationPlacement[] = input.stations.map(() => ({ show: false, nameShift: 0, valueShift: 0 }))

  let gx: number | null = null
  let ring = false
  if (input.guess != null) {
    gx = X(input.guess)
    // mostly hidden by the dot: ring the dot itself ("you guessed right here")
    ring = Math.abs(gx - ux) < H.userR - 4
    if (ring) gx = ux
  }

  for (const i of PRIORITY) {
    const st = input.stations[i]
    if (!st) continue
    const sx = X(st.p)
    // under the "you" dot: the dot is the station now
    if (Math.abs(sx - ux) < H.userR + H.stationR - 2) continue
    const ns = fit(sx, st.name, names, { ...bounds, maxShift: Math.max(0, st.name / 2 - 4) })
    const vs = fit(sx, st.value, values, { ...bounds, maxShift: Math.max(0, st.value / 2 - 4) })
    if (ns === null || vs === null) continue
    names.push(around(sx + ns, st.name / 2))
    values.push(around(sx + vs, st.value / 2))
    stations[i] = { show: true, nameShift: ns, valueShift: vs }
  }

  let guess: HGuessPlacement | null = null
  if (gx !== null) {
    const gw = input.guessLabel ?? 160
    const inRow = ring ? null : fit(gx, gw, values, { ...bounds, maxShift: Math.max(0, gw / 2 - 16) })
    guess =
      inRow !== null
        ? { ring, row: 'values', shift: inRow }
        : { ring, row: 'below', shift: fit(gx, gw, [], { ...bounds, maxShift: Infinity }) ?? 0 }
  }

  return { flagShift, stations, guess }
}

/* ------------------------------------------------------------------ vertical */

/** Geometry of the vertical line (px); mirrors Lines.module.css. */
export const V = {
  userR: 21,
  stationR: 11,
  guessR: 12,
  /** half-heights of the label blocks beside the line */
  userHalf: 23,
  guessHalf: 19,
  stationHalf: 17,
  /** space above P99 and below P1 */
  pad: 26,
}

export interface VLayout {
  /** y of a stop, px from the top */
  y: (p: number) => number
  userShift: number
  stations: Array<{ show: boolean; shift: number }>
  guess: { ring: boolean; shift: number } | null
}

export function layoutVertical(input: { height: number; user: number; guess?: number | null; stationPs: number[] }): VLayout {
  const Hh = Math.max(200, input.height)
  const y = (p: number) => V.pad + ((99 - Math.min(99, Math.max(1, p))) / 98) * (Hh - 2 * V.pad)
  const bounds = { min: -6, max: Hh + 6 }
  const uy = y(input.user)
  const userShift = fit(uy, V.userHalf * 2, [], { ...bounds, maxShift: Infinity }) ?? 0
  const placed: Span[] = [around(uy + userShift, V.userHalf)]
  const dot = around(uy, V.userR)

  let guess: VLayout['guess'] = null
  if (input.guess != null) {
    const ring = Math.abs(y(input.guess) - uy) < V.userR - 4
    const gy = ring ? uy : y(input.guess)
    const shift = fit(gy, V.guessHalf * 2, placed, { ...bounds, maxShift: 64, gap: 4 }) ?? 0
    placed.push(around(gy + shift, V.guessHalf))
    guess = { ring, shift }
  }

  const stations = input.stationPs.map(() => ({ show: false, shift: 0 }))
  for (const i of PRIORITY) {
    const p = input.stationPs[i]
    if (p === undefined) continue
    const sy = y(p)
    if (!clear(around(sy, V.stationR), dot, 2)) continue
    const shift = fit(sy, V.stationHalf * 2, placed, { ...bounds, maxShift: 10, gap: 4 })
    if (shift === null) continue
    placed.push(around(sy + shift, V.stationHalf))
    stations[i] = { show: true, shift }
  }

  return { y, userShift, stations, guess }
}
