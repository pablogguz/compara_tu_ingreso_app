'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Level, Stats } from '@/prototypes/shared/useLevels'
import { smoothPath } from '@/prototypes/shared/chart'
import { euro, headline, num, pct, perceptionGap, shareText } from '@/prototypes/shared/format'
import { shareResult } from '@/prototypes/shared/share'
import { findPercentile } from '@/lib/calculations'
import { XMAX, contract, cx, levelPhrase, levelTitle } from './copy'
import { curveInSquares, peakOf } from './geometry'
import { useSize } from './hooks'
import a from './App.module.css'
import s from './Summary.module.css'

interface SummaryProps {
  levels: Level[]
  stats: Stats | null
  income: number
  rawNational: number
  guess: number
  onAgain: () => void
}

// Act III: the three levels side by side on one scale, the municipality in
// three figures, and what to do next.
export default function Summary({ levels, stats, income, rawNational, guess, onAgain }: SummaryProps) {
  const curves = useMemo(() => levels.map((l) => curveInSquares(l.density)), [levels])
  const peak = Math.max(...curves.map(peakOf))
  const national = levels[0]
  const gap = perceptionGap(rawNational, guess)
  const mun = levels[2]

  const [shared, setShared] = useState('')
  useEffect(() => {
    if (!shared) return
    const t = setTimeout(() => setShared(''), 2800)
    return () => clearTimeout(t)
  }, [shared])
  const share = async () => {
    const outcome = await shareResult(shareText(national.percentile))
    setShared(outcome === 'copied' ? 'Copiado' : outcome === 'shared' ? 'Compartido' : 'No se pudo copiar')
  }

  return (
    <section id="resumen" className={cx(a.flow, a.section, s.summary)} aria-labelledby="ensayo-resumen">
      <div className={a.sectionHead}>
        <span className={a.secNum}>3</span>
        <h2 className={a.h2} id="ensayo-resumen">
          Tu resumen
        </h2>
      </div>
      <p className={s.lead}>
        {headline(national.percentile, 'España')}. {gap.diff === 0 ? `Creías estar en el ${guess}: lo clavaste.` : gap.sentence}
      </p>

      <figure className={cx(a.wide, s.figure)} aria-labelledby="ensayo-fig3">
        <div className={s.minis}>
          {levels.map((l, i) => (
            <Mini key={l.key} level={l} values={curves[i]} peak={peak} income={income} />
          ))}
        </div>
        <figcaption className={cx(a.caption, s.caption)} id="ensayo-fig3">
          <b>Figura 3.</b> Tu renta por unidad de consumo (en azul) en las tres distribuciones, a la misma escala; la
          línea de puntos marca la mediana de cada una. Pasa el ratón o el dedo por una curva para ver en qué percentil
          estaría cada renta.
        </figcaption>
      </figure>

      {stats && (
        <section className={s.facts} aria-labelledby="ensayo-asi">
          <h3 className={s.h3} id="ensayo-asi">
            Así es {mun.place}
          </h3>
          <dl className={s.factList}>
            <Fact
              value={euro(stats.net_income_equiv)}
              label="Renta media por unidad de consumo"
              year={2024}
              imputed={stats.net_income_equiv_is_imputed === 1}
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

      <div className={s.actions}>
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

/** "Renta media por unidad de consumo (2024)", or "(2024, media provincial)" when imputed. */
function Fact({ value, label, year, imputed }: { value: string; label: string; year: number; imputed: boolean }) {
  return (
    <div className={s.fact}>
      <dt className={s.factLabel}>
        {label} ({year}
        {imputed ? ', media provincial' : ''})
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
}

function Mini({ level, values, peak, income }: MiniProps) {
  const [ref, box] = useSize<HTMLDivElement>({ width: 300, height: 140 })
  const [probe, setProbe] = useState<number | null>(null)
  const W = box.width
  const H = box.height
  const TOP = 22
  const base = H - 1
  const n = values.length - 1
  const pts: Array<[number, number]> = values.map((v, i) => [(i / n) * W, base - (v / peak) * (base - TOP)])
  const line = smoothPath(pts)
  const area = `${line}L${W} ${base}L0 ${base}Z`
  const x = (v: number) => Math.max(0, Math.min(W, (v / XMAX) * W))
  const yAt = (v: number) => {
    const f = Math.max(0, Math.min(1, v / XMAX)) * n
    const lo = Math.floor(f)
    const hi = Math.min(n, lo + 1)
    const val = values[lo] + (values[hi] - values[lo]) * (f - lo)
    return base - (val / peak) * (base - TOP)
  }
  const ux = x(income)
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
          {p <= 1 ? 'entre el 1 % con menos ingresos' : `más que el ${p} % de la población`}
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
        aria-label={`${title}: ${contract(headline(p, levelPhrase(level.key, level.place)))}. La mediana es ${euro(level.median)}.`}
      >
        <svg width={W} height={H} className={s.svg} aria-hidden="true" focusable="false">
          <path d={area} className={s.area} />
          <path d={left} className={s.areaLeft} />
          <path d={line} className={s.curve} />
          <line x1={mx} x2={mx} y1={base} y2={TOP - 6} className={s.median} />
          <line x1={ux} x2={ux} y1={base} y2={TOP - 12} className={s.you} />
          <line x1={0} x2={W} y1={base + 0.5} y2={base + 0.5} className={s.axis} />
          {probe !== null && <line x1={probe} x2={probe} y1={base} y2={TOP} className={s.probe} />}
        </svg>
        <span
          className={cx(s.youLabel, ux > W - 60 && s.youLabelLeft)}
          style={{ left: ux, top: TOP - 20 }}
        >
          {beyond ? 'Tú →' : 'Tú'}
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
