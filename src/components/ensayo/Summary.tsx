'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Level, Stats } from '@/hooks/useLevels'
import { smoothPath } from '@/lib/chartGeometry'
import { euro, headline, num, pct, perceptionGap, shareText } from '@/lib/format'
import { shareResult } from '@/lib/share'
import { INCOME_YEAR } from '@/lib/years'
import { findPercentile } from '@/lib/calculations'
import { XMAX, contract, cx, levelPhrase, levelTitle } from './copy'
import { curveInSquares, peakOf } from './geometry'
import { useReveal, useSize } from './hooks'
import a from './App.module.css'
import s from './Summary.module.css'

interface SummaryProps {
  levels: Level[]
  stats: Stats | null
  income: number
  rawNational: number
  guess: number
  /** the income at the guessed percentile, nationally */
  guessValue: number
  onAgain: () => void
}

// Act III: the three levels side by side on one scale, the municipality in
// three figures, and what to do next.
export default function Summary({ levels, stats, income, rawNational, guess, guessValue, onAgain }: SummaryProps) {
  const curves = useMemo(() => levels.map((l) => curveInSquares(l.density)), [levels])
  const peak = Math.max(...curves.map(peakOf))
  const national = levels[0]
  const gap = perceptionGap(rawNational, guess)
  const mun = levels[2]

  const [shared, setShared] = useState('')
  // each block rises into place the first time it is seen
  const [headRef, headShown] = useReveal<HTMLDivElement>()
  const [leadRef, leadShown] = useReveal<HTMLParagraphElement>()
  const [figRef, figShown] = useReveal<HTMLElement>()
  const [factsRef, factsShown] = useReveal<HTMLElement>()
  const [actionsRef, actionsShown] = useReveal<HTMLDivElement>()
  const reveal = (shown: boolean) => cx(a.reveal, shown && a.revealShown)
  useEffect(() => {
    if (!shared) return
    const t = setTimeout(() => setShared(''), 2800)
    return () => clearTimeout(t)
  }, [shared])
  const share = async () => {
    const outcome = await shareResult(shareText(national.rawPercentile))
    setShared(outcome === 'copied' ? 'Copiado' : outcome === 'shared' ? 'Compartido' : 'No se pudo copiar')
  }

  return (
    <section id="resumen" className={cx(a.flow, a.section, s.summary)} aria-labelledby="ensayo-resumen">
      <div ref={headRef} className={cx(a.sectionHead, reveal(headShown))}>
        <span className={a.secNum}>2</span>
        <h2 className={a.h2} id="ensayo-resumen">
          Tu resumen
        </h2>
      </div>
      <p ref={leadRef} className={cx(s.lead, reveal(leadShown))}>
        {headline(national.rawPercentile, 'España')}. {gap.sentence}
      </p>

      <figure ref={figRef} className={cx(a.wide, s.figure, reveal(figShown))} aria-labelledby="ensayo-fig2">
        <div className={s.minis}>
          {levels.map((l, i) => (
            <Mini key={l.key} level={l} values={curves[i]} peak={peak} income={income} guessValue={guessValue} />
          ))}
        </div>
        <figcaption className={cx(a.caption, s.caption)} id="ensayo-fig2">
          <b>Figura 2.</b> La renta de tu hogar (en azul) y tu predicción (en ocre) en las tres distribuciones, a la
          misma escala. La línea de puntos marca la mediana de cada una. Pasa el ratón o el dedo por una curva para ver en qué percentil estaría
          cada renta.
        </figcaption>
      </figure>

      {stats && (
        <section ref={factsRef} className={cx(s.facts, reveal(factsShown))} aria-labelledby="ensayo-asi">
          <h3 className={s.h3} id="ensayo-asi">
            Así es {mun.place}
          </h3>
          <dl className={s.factList}>
            <Fact
              value={euro(stats.net_income_equiv)}
              label="Renta media por unidad de consumo"
              year={INCOME_YEAR}
              imputed={stats.net_income_equiv_is_imputed === 1}
              imputedAs="estimada"
            />
            <Fact
              value={pct(stats.pct_higher_ed_completed)}
              label="Personas de 15 años o más con estudios superiores"
              year={2023}
              imputed={stats.pct_higher_ed_completed_is_imputed === 1}
            />
            <Fact
              value={pct(stats.pct_foreign_born)}
              label="Personas nacidas en el extranjero"
              year={2024}
              imputed={stats.pct_foreign_born_is_imputed === 1}
            />
          </dl>
        </section>
      )}

      <div ref={actionsRef} className={cx(s.actions, reveal(actionsShown))}>
        <button type="button" className={a.btn} onClick={share}>
          Compartir
        </button>
        <button type="button" className={cx(a.btn, a.btnSecondary)} onClick={onAgain}>
          Volver a empezar
        </button>
        <span className={s.shared} role="status" aria-live="polite">
          {shared}
        </span>
      </div>
    </section>
  )
}

/** "Renta media por unidad de consumo (2025)", or "(2025, estimada)" / "(2023, media provincial)" when imputed. */
function Fact({
  value,
  label,
  year,
  imputed,
  imputedAs = 'media provincial',
}: {
  value: string
  label: string
  year: number
  imputed: boolean
  imputedAs?: string
}) {
  return (
    <div className={s.fact}>
      <dt className={s.factLabel}>
        {label} ({year}
        {imputed ? `, ${imputedAs}` : ''})
      </dt>
      <dd className={s.factValue}>{value}</dd>
    </div>
  )
}

/* ---- one small multiple ---- */

interface MiniProps {
  level: Level
  /** the curve in squares, sampled over 0…XMAX */
  values: number[]
  /** the common peak, so the three share one vertical scale */
  peak: number
  income: number
  guessValue: number
}

// approximate label widths at 12px, to keep "Tu hogar" and "Tu predicción" apart
const YOU_W = 58
const GUESS_W = 84

function Mini({ level, values, peak, income, guessValue }: MiniProps) {
  const [ref, box] = useSize<HTMLDivElement>({ width: 300, height: 140 })
  const [probe, setProbe] = useState<number | null>(null)
  const W = box.width
  const H = box.height
  const base = H - 1
  const x = (v: number) => Math.max(0, Math.min(W, (v / XMAX) * W))
  const ux = x(income)
  const gx = x(guessValue)

  // Each label sits beside its line, the left one pointing left and the right
  // one pointing right, so they part ways; near an edge a label turns back,
  // and if the two still meet the prediction drops to a second row.
  const youLeftward = ux > W - YOU_W - 6 || (gx > ux && ux - YOU_W - 5 >= 0)
  const guessLeftward = gx > W - GUESS_W - 6 || (gx < ux && gx - GUESS_W - 5 >= 0)
  const span = (at: number, width: number, leftward: boolean): [number, number] =>
    leftward ? [at - 5 - width, at - 5] : [at + 5, at + 5 + width]
  const [ya, yb] = span(ux, YOU_W, youLeftward)
  const [ga, gb] = span(gx, GUESS_W, guessLeftward)
  const guessLow = ga < yb + 4 && ya < gb + 4
  // income and guess sit at the same x in all three charts, so all three
  // make the same room for a second row and keep one vertical scale
  const TOP = guessLow ? 38 : 22
  const n = values.length - 1
  const pts: Array<[number, number]> = values.map((v, i) => [(i / n) * W, base - (v / peak) * (base - TOP)])
  const line = smoothPath(pts)
  const area = `${line}L${W} ${base}L0 ${base}Z`
  const yAt = (v: number) => {
    const f = Math.max(0, Math.min(1, v / XMAX)) * n
    const lo = Math.floor(f)
    const hi = Math.min(n, lo + 1)
    const val = values[lo] + (values[hi] - values[lo]) * (f - lo)
    return base - (val / peak) * (base - TOP)
  }
  const leftPts = [...pts.filter((p) => p[0] < ux), [ux, yAt(income)] as [number, number]]
  const left = `${smoothPath(leftPts)}L${ux} ${base}L0 ${base}Z`
  const mx = x(level.median)
  const beyond = income > XMAX

  const probeValue = probe === null ? null : Math.round(((probe / W) * XMAX) / 500) * 500
  const probeP = probeValue === null ? null : Math.min(99, Math.max(1, findPercentile(probeValue, level.percentiles)))
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setProbe(Math.max(0, Math.min(W, e.clientX - r.left)))
  }
  const title = levelTitle(level.key, level.place)
  const p = level.percentile

  return (
    <div className={s.mini}>
      <p className={s.miniTitle}>{title}</p>
      <p className={s.miniFigure}>
        <span className={s.miniNum}>{p}</span>
        <span className={s.miniSentence}>
          {level.rawPercentile < 1 ? 'entre el 1 % con menos ingresos' : `más que el ${p} % de la población`}
          <span className={s.miniMedian}>Mediana: {euro(level.median)}</span>
        </span>
      </p>
      <div
        ref={ref}
        className={s.plot}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setProbe(null)}
        role="img"
        aria-label={`${title}: ${contract(headline(level.rawPercentile, levelPhrase(level.key, level.place)))}. La mediana es ${euro(level.median)}. Tu predicción, ${euro(guessValue)}.`}
      >
        <svg width={W} height={H} className={s.svg} aria-hidden="true" focusable="false">
          <path d={area} className={s.area} />
          <path d={left} className={s.areaLeft} />
          <path d={line} className={s.curve} />
          <line x1={mx} x2={mx} y1={base} y2={TOP - 6} className={s.median} />
          <line x1={gx} x2={gx} y1={base} y2={guessLow ? 26 : 10} className={s.guess} />
          <line x1={ux} x2={ux} y1={base} y2={10} className={s.you} />
          <line x1={0} x2={W} y1={base + 0.5} y2={base + 0.5} className={s.axis} />
          {probe !== null && <line x1={probe} x2={probe} y1={base} y2={TOP} className={s.probe} />}
        </svg>
        <span className={cx(s.youLabel, youLeftward && s.youLabelLeft)} style={{ left: ux, top: 2 }}>
          {beyond ? 'Tu hogar →' : 'Tu hogar'}
        </span>
        <span
          className={cx(s.youLabel, s.guessLabel, guessLeftward && s.youLabelLeft)}
          style={{ left: gx, top: guessLow ? 18 : 2 }}
        >
          Tu predicción
        </span>
        {probe !== null && probeValue !== null && (
          <span className={cx(s.probeLabel, probe > W / 2 && s.probeLabelLeft)} style={{ left: probe }}>
            {euro(probeValue)} · percentil {probeP}
          </span>
        )}
      </div>
      <div className={s.ticks} aria-hidden="true">
        {[0, 30000, 60000, 90000].map((v) => (
          <span key={v} className={s.tick} style={{ left: `${(v / XMAX) * 100}%` }}>
            {v === 0 ? '0' : num(v)}
            {v === XMAX ? ' €' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
