'use client'

import { useEffect, useRef } from 'react'
import { loadNationalDensity, loadNationalPercentiles } from '@/lib/dataLoader'
import s from './HeroField.module.css'

// The opening animation. Spain as a crowd of dots that drift in, flow left to
// right into a pile by income (the real national percentiles) and become the
// income distribution; a curve is drawn over the pile, the axis appears, and a
// blue "¿Tú?" drops in and walks along the curve looking for its place.
//
// Decorative (aria-hidden). Where there is no IntersectionObserver (tests) it
// draws nothing; with reduced motion it draws the last frame.

type Density = Array<{ x: number; y: number }>
interface Data {
  percentiles: number[]
  density: Density
}

const XMAX = 85000
const MAX_DOTS = 2800
const GATHER = 1.1 // s of crowd before the dots move
const FLIGHT = 1.5 // s each dot takes to reach its place
const BUCKETS = 14
const RAMP_FROM = [199, 207, 218] // #c7cfda, less income
const RAMP_TO = [66, 80, 104] // #425068, more income
const INK = '#1a1d23'
const HAIR = '#cdc9c0'
const LABEL = '#5f6673'
const YOU = '#2458c6'
// where "¿Tú?" walks: quantiles of the distribution, then it rests at the median
const WALK = [0.5, 0.22, 0.82, 0.5]
const WALK_TIME = [1.9, 2.3, 1.7]
const WALK_PAUSE = 0.7

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
const easeOut = (x: number) => 1 - (1 - x) ** 3

/** Deterministic randomness, so a resize keeps every dot where it was. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20240)
const NOISE = Array.from({ length: MAX_DOTS }, () => [rand(), rand(), rand(), rand(), rand(), rand()])

/** Income at quantile q (0–1) from the 99 percentiles. */
function quantile(p: number[], q: number): number {
  if (q <= 0.01) return p[0] * (q / 0.01) ** 0.8
  if (q >= 0.99) return p[98] * (1 + (q - 0.99) * 60)
  const i = q * 100 - 1
  const lo = Math.floor(i)
  const t = i - lo
  return p[lo] * (1 - t) + p[lo + 1] * t
}

/** A density normalised to integrate to 1, as a function of income. */
function densityFn(d: Density): (x: number) => number {
  let area = 0
  for (let i = 1; i < d.length; i++) area += ((d[i].y + d[i - 1].y) / 2) * (d[i].x - d[i - 1].x)
  const k = area > 0 ? 1 / area : 0
  return (x: number) => {
    if (x <= d[0].x || x >= d[d.length - 1].x) return 0
    let lo = 0
    let hi = d.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (d[mid].x <= x) lo = mid
      else hi = mid
    }
    const t = (x - d[lo].x) / (d[hi].x - d[lo].x)
    return (d[lo].y + t * (d[hi].y - d[lo].y)) * k
  }
}

/** If the data can't be loaded: a log-normal with a 20.000 € median. */
function fallback(): Data {
  const mu = Math.log(20000)
  const sigma = 0.62
  const density: Density = []
  for (let x = 100; x <= 200000; x += 200) {
    density.push({ x, y: Math.exp(-((Math.log(x) - mu) ** 2) / (2 * sigma * sigma)) / (x * sigma * Math.sqrt(2 * Math.PI)) })
  }
  const percentiles: number[] = []
  let cum = 0
  let next = 1
  for (let i = 1; i < density.length && next < 100; i++) {
    cum += ((density[i].y + density[i - 1].y) / 2) * (density[i].x - density[i - 1].x)
    while (next < 100 && cum >= next / 100) {
      percentiles.push(density[i].x)
      next++
    }
  }
  return { percentiles, density }
}

interface Dot {
  sx: number
  sy: number
  cx: number
  cy: number
  tx: number
  ty: number
  appear: number
  delay: number
  phase: number
}

interface Model {
  w: number
  h: number
  size: number
  left: number
  plotW: number
  base: number
  top: number
  buckets: Dot[][]
  colors: string[]
  curve: Array<[number, number]>
  walk: number[]
  small: boolean
}

function build(w: number, h: number, data: Data): Model {
  const small = w < 520
  const mid = w < 1000
  const size = small ? 3 : mid ? 3.5 : 4
  const cell = size + (small ? 1 : mid ? 1.2 : 1.5)
  const margin = Math.max(small ? 16 : 28, (w - 1180) / 2)
  const left = margin
  const plotW = w - 2 * margin
  const base = h - (small ? 30 : 34)
  const top = small ? 40 : 52
  const cols = Math.max(20, Math.floor(plotW / cell))
  const colEuro = XMAX / cols
  const pdf = densityFn(data.density)

  // as many dots as fit under the tallest pile
  let peak = 0
  for (let c = 0; c < cols; c++) peak = Math.max(peak, pdf((c + 0.5) * colEuro) * colEuro)
  const cap = small ? 1100 : mid ? 1800 : MAX_DOTS
  const n = Math.round(clamp(((base - top) / cell / Math.max(peak, 1e-9)) * 0.9, 300, cap))

  const buckets: Dot[][] = Array.from({ length: BUCKETS }, () => [])
  const stacks = new Array<number>(cols).fill(0)
  for (let k = 0; k < n; k++) {
    const [rx, ry, rc, ra, rd, rp] = NOISE[k]
    const q = (k + 0.5) / n
    const income = quantile(data.percentiles, q)
    const col = Math.floor(income / colEuro)
    let tx: number
    let ty: number
    if (col >= cols) {
      // the richest leave the frame to the right: the tail goes on
      tx = w + 12 + rc * 60
      ty = base - 8 - ry * (base - top) * 0.4
    } else {
      tx = left + col * cell
      ty = base - (stacks[col] + 1) * cell
      stacks[col]++
    }
    const sx = left + rx * plotW
    const sy = top + ry * (base - top - size)
    const along = clamp((tx - left) / plotW)
    buckets[Math.min(BUCKETS - 1, Math.floor(q * BUCKETS))].push({
      sx,
      sy,
      cx: (sx + tx) / 2 + (rc - 0.5) * 140,
      cy: Math.min(sy, ty) - 30 - rd * 90,
      tx,
      ty,
      appear: ra * 0.9,
      delay: 0.1 + along * 0.95 + rd * 0.3,
      phase: rp * Math.PI * 2,
    })
  }

  const colors = Array.from({ length: BUCKETS }, (_, b) => {
    const t = b / (BUCKETS - 1)
    const c = RAMP_FROM.map((v, i) => Math.round(v + (RAMP_TO[i] - v) * t))
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
  })

  // the curve sits on the piles: its height is what a column would hold
  const curve: Array<[number, number]> = []
  for (let x = left; x <= left + plotW + 0.5; x += 2) {
    const euro = ((x - left) / plotW) * XMAX
    curve.push([x, base - pdf(euro) * colEuro * n * cell])
  }
  const walk = WALK.map((q) => left + (quantile(data.percentiles, q) / XMAX) * plotW)

  return { w, h, size, left, plotW, base, top, buckets, colors, curve, walk, small }
}

function curveY(m: Model, x: number): number {
  const i = clamp((x - m.left) / 2, 0, m.curve.length - 1)
  const lo = Math.floor(i)
  const hi = Math.min(lo + 1, m.curve.length - 1)
  return m.curve[lo][1] + (m.curve[hi][1] - m.curve[lo][1]) * (i - lo)
}

/** Where "¿Tú?" stands at time t after it lands, and when it stops walking. */
function walker(m: Model, t: number): { x: number; done: boolean } {
  let clock = t
  for (let i = 0; i < WALK_TIME.length; i++) {
    if (clock < WALK_PAUSE) return { x: m.walk[i], done: false }
    clock -= WALK_PAUSE
    if (clock < WALK_TIME[i]) {
      const p = easeInOut(clock / WALK_TIME[i])
      return { x: m.walk[i] + (m.walk[i + 1] - m.walk[i]) * p, done: false }
    }
    clock -= WALK_TIME[i]
  }
  return { x: m.walk[m.walk.length - 1], done: true }
}

const WALK_TOTAL = WALK_TIME.reduce((a, b) => a + b, 0) + WALK_PAUSE * WALK_TIME.length

function draw(ctx: CanvasRenderingContext2D, m: Model, t: number, move: number, fonts: { sans: string; serif: string }) {
  ctx.clearRect(0, 0, m.w, m.h)
  const tm = t - move

  // the axis
  const axis = clamp((tm - 1.5) / 0.9)
  if (axis > 0) {
    ctx.globalAlpha = axis
    ctx.fillStyle = HAIR
    ctx.fillRect(m.left, m.base + 1, m.plotW, 1)
    ctx.fillStyle = LABEL
    ctx.font = `500 ${m.small ? 10.5 : 11.5}px ${fonts.sans}`
    ctx.textBaseline = 'top'
    const ticks = m.small ? [0, 40000, 80000] : [0, 20000, 40000, 60000, 80000]
    for (const v of ticks) {
      const x = m.left + (v / XMAX) * m.plotW
      ctx.textAlign = v === 0 ? 'left' : 'center'
      ctx.fillText(v === 0 ? '0 €' : `${(v / 1000).toFixed(0)}.000 €`, x, m.base + 10)
    }
    if (!m.small) {
      ctx.textAlign = 'right'
      ctx.fillText('→', m.left + m.plotW, m.base + 10)
    }
  }

  // the crowd, then the pile
  for (let b = 0; b < m.buckets.length; b++) {
    ctx.fillStyle = m.colors[b]
    for (const d of m.buckets[b]) {
      const a = clamp((t - d.appear) / 0.6)
      if (a <= 0) continue
      const p = tm > 0 ? easeInOut(clamp((tm - d.delay) / FLIGHT)) : 0
      const drift = 1 - p
      const u = 1 - p
      let x = u * u * d.sx + 2 * u * p * d.cx + p * p * d.tx
      let y = u * u * d.sy + 2 * u * p * d.cy + p * p * d.ty
      if (drift > 0) {
        x += Math.sin(t * 0.9 + d.phase) * 2.2 * drift
        y += Math.cos(t * 0.7 + d.phase) * 2.2 * drift
      }
      ctx.globalAlpha = a
      ctx.fillRect(x, y, m.size, m.size)
    }
  }

  // the curve, drawn left to right over the pile
  const reach = easeInOut(clamp((tm - 2.0) / 1.6))
  if (reach > 0) {
    const edge = m.left + reach * m.plotW
    ctx.globalAlpha = 1
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4
    ctx.lineJoin = 'round'
    ctx.beginPath()
    let last: [number, number] = m.curve[0]
    ctx.moveTo(last[0], last[1])
    for (const pt of m.curve) {
      if (pt[0] > edge) break
      ctx.lineTo(pt[0], pt[1])
      last = pt
    }
    ctx.stroke()
    if (reach < 1) {
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(last[0], last[1], 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // "¿Tú?": drops onto the curve, walks along it, then rests and breathes
  const ty = tm - 3.7
  if (ty > 0) {
    const you = m.size + 3
    const { x: wx, done } = walker(m, ty - 0.9)
    const ground = curveY(m, wx) - you - 3
    const fall = easeOut(clamp(ty / 0.9))
    const y = m.top - 40 + (ground - (m.top - 40)) * fall
    const x = wx - you / 2
    ctx.globalAlpha = clamp(ty / 0.3)
    ctx.fillStyle = YOU
    ctx.fillRect(x, y, you, you)

    const label = clamp((ty - 0.5) / 0.5)
    if (label > 0) {
      ctx.globalAlpha = label
      ctx.font = `italic 400 ${m.small ? 15 : 17}px ${fonts.serif}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('¿Tú?', wx, y - 9)
    }

    if (done) {
      const since = ty - 0.9 - WALK_TOTAL
      const phase = (since % 2.8) / 2.8
      ctx.globalAlpha = 0.45 * (1 - phase)
      ctx.strokeStyle = YOU
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(wx, y + you / 2, you / 2 + 2 + phase * 14, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

export default function HeroField() {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = wrap.current
    const el = canvas.current
    if (!box || !el || typeof IntersectionObserver === 'undefined') return
    const ctx = el.getContext('2d')
    if (!ctx) return

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const css = getComputedStyle(box)
    const fonts = {
      sans: css.getPropertyValue('--font-hanken').trim() || 'system-ui, sans-serif',
      serif: css.getPropertyValue('--font-fraunces').trim() || 'Georgia, serif',
    }

    let data: Data | null = null
    let model: Model | null = null
    let start = performance.now()
    let move = Infinity // when the dots start to move (s), once the data is in
    let frame = 0
    let visible = true
    let alive = true

    const size = () => {
      const r = box.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.round(r.width * dpr)
      el.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (data) model = build(r.width, r.height, data)
    }

    const render = () => {
      frame = 0
      if (!alive || !model) return
      const t = still ? 1e6 : (performance.now() - start) / 1000
      draw(ctx, model, t, still ? 0 : move, fonts)
      if (!still && visible) frame = requestAnimationFrame(render)
    }

    const kick = () => {
      if (!frame && alive) frame = requestAnimationFrame(render)
    }

    const ready = (d: Data) => {
      if (!alive) return
      data = d
      size()
      move = Math.max(GATHER, (performance.now() - start) / 1000)
      kick()
    }

    Promise.all([loadNationalPercentiles(), loadNationalDensity()])
      .then(([percentiles, density]) =>
        ready(percentiles?.length === 99 && density?.length ? { percentiles, density } : fallback())
      )
      .catch(() => ready(fallback()))

    // the crowd gathers while the data loads
    start = performance.now()
    size()
    if (!model) {
      const provisional = fallback()
      model = build(box.clientWidth, box.clientHeight, provisional)
    }
    kick()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      size()
      kick()
    }) : null
    ro?.observe(box)

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) kick()
    })
    io.observe(box)

    return () => {
      alive = false
      if (frame) cancelAnimationFrame(frame)
      ro?.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <div ref={wrap} className={s.field} aria-hidden="true">
      <canvas ref={canvas} className={s.canvas} />
    </div>
  )
}
