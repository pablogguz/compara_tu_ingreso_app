'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { Flow } from '../shared/useFlow'
import type { LevelsData } from '../shared/useLevels'
import { euro, headline, pct, perceptionGap, shareText } from '../shared/format'
import { shareResult, type ShareOutcome } from '../shared/share'
import { CODE_URL, splitAtPercent, standfirst } from './copy'
import Grafico from './Grafico'
import Escalas from './Escalas'
import s from './Articulo.module.css'

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ')

interface ArticuloProps {
  flow: Flow
  data: LevelsData
  onRestart: () => void
  onMethod: () => void
  onAnnounce: (text: string) => void
}

interface Fact {
  key: string
  value: number
  text: string
  label: string
  note?: string
}

// The result, written up as a feature article: headline, standfirst, the
// annotated chart, the three scales and a sidebar with the figures.
export default function Articulo({ flow, data, onRestart, onMethod, onAnnounce }: ArticuloProps) {
  const uid = useId()
  const [national, provincial, municipal] = data.levels
  const guess = flow.answers.perceivedPercentile
  const income = flow.equivIncome ?? flow.results?.equiv_income ?? 0
  const p = national.percentile
  const gap = perceptionGap(national.rawPercentile, guess)
  const title = headline(p, 'España')
  const parts = splitAtPercent(title)
  const dek = standfirst(income, p, gap.sentence)
  const xmax = Math.max(90000, Math.ceil(national.p99 / 15000) * 15000)
  const over = income > xmax

  const munName = municipal.place
  const munDisplay = munName === provincial.place ? `${munName} (municipio)` : munName
  const names = ['España', provincial.label, munDisplay]
  const places = ['España', `la provincia de ${provincial.place}`, munName]
  const scales = data.levels.map((level, i) => ({ level, name: names[i] }))

  const stats = data.stats
  const facts: Fact[] = []
  if (stats) {
    const withYear = (label: string, year: number, imputed: number | undefined) =>
      `${label} (${year}${imputed ? ', media provincial' : ''})`
    const candidates: Array<Fact | null> = [
      Number.isFinite(stats.net_income_equiv)
        ? {
            key: 'income',
            value: stats.net_income_equiv,
            text: euro(stats.net_income_equiv),
            label: withYear('Renta media por unidad de consumo', 2024, stats.net_income_equiv_is_imputed),
            note: `La de tu hogar: ${euro(income)}`,
          }
        : null,
      Number.isFinite(stats.pct_higher_ed_completed)
        ? {
            key: 'edu',
            value: stats.pct_higher_ed_completed,
            text: pct(stats.pct_higher_ed_completed),
            label: withYear(
              'Población de 15 y más años con estudios superiores',
              2023,
              stats.pct_higher_ed_completed_is_imputed
            ),
          }
        : null,
      Number.isFinite(stats.pct_foreign_born)
        ? {
            key: 'foreign',
            value: stats.pct_foreign_born,
            text: pct(stats.pct_foreign_born),
            label: withYear('Población nacida en el extranjero', 2024, stats.pct_foreign_born_is_imputed),
          }
        : null,
    ]
    for (const c of candidates) if (c) facts.push(c)
  }

  // ---- share ----------------------------------------------------------------
  const [shared, setShared] = useState<ShareOutcome | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const share = async () => {
    const outcome = await shareResult(shareText(p))
    setShared(outcome)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShared(null), 2800)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const shareNote =
    shared === 'copied' ? 'Copiado' : shared === 'failed' ? 'No se pudo copiar' : shared === 'shared' ? 'Compartido' : ''

  // ---- announce the result and move focus to the headline -------------------
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    onAnnounce(`${title}. ${dek}`)
    titleRef.current?.focus({ preventScroll: true })
    // once, when the article is set
  }, []) // eslint-disable-line

  return (
    <main className={s.article}>
      <header className={cx(s.head, s.enter)}>
        <p className={s.kicker}>Tu resultado · {munName}</p>
        <h1 ref={titleRef} tabIndex={-1} className={s.headline}>
          {parts.before}
          <span className={s.hot}>{parts.figure}</span>
          {parts.after}
        </h1>
        <p className={s.dek}>{dek}</p>
        <p className={s.byline}>
          <span className={s.wideOnly}>
            Por Compara tu ingreso · Datos: INE, Atlas de Distribución de Renta de los Hogares (2023, proyectado a
            2024)
          </span>
          <span className={s.narrowOnly}>Datos: INE (2023, proyectado a 2024)</span>
        </p>
      </header>

      <div className={s.body}>
        <div className={s.main}>
          <figure className={cx(s.figure, s.enter, s.d1)}>
            <p className={s.figTitle}>Cuántas personas hay en cada nivel de renta</p>
            <Grafico level={national} income={income} guess={guess} guessValue={data.guessValue} xmax={xmax} />
            <figcaption className={s.caption}>
              Renta neta anual por unidad de consumo, 2024. La zona oscura es la población que vive en hogares con
              menos ingresos que el tuyo.
              {over && ` Tus ${euro(income)} quedan fuera del gráfico, a la derecha.`}
              <span className={s.narrowOnly}> La mediana está en {euro(national.median)}.</span>
            </figcaption>
          </figure>

          <section className={s.scales} aria-labelledby={`${uid}-scales`}>
            <h2 id={`${uid}-scales`} className={s.sectionHead}>
              El mismo hogar, a tres escalas
            </h2>
            <Escalas levels={data.levels} names={names} places={places} income={income} xmax={xmax} />
          </section>
        </div>

        <aside className={cx(s.aside, s.enter, s.d3)}>
          <section className={s.cifras} aria-labelledby={`${uid}-cifras`}>
            <h2 id={`${uid}-cifras`} className={s.sectionHead}>
              <span className={s.wideOnly}>En cifras</span>
              <span className={s.narrowOnly}>A tres escalas</span>
            </h2>
            <ul className={s.rows}>
              {scales.map(({ level, name }) => (
                <li key={level.key} className={s.row} style={{ '--p': `${level.percentile}%` } as CSSProperties}>
                  <div className={s.rowHead}>
                    <span className={s.rowName}>{name}</span>
                    <span className={s.rowValue}>
                      <span className={s.srOnly}>percentil </span>
                      {level.percentile}
                    </span>
                  </div>
                  <div className={s.bar} aria-hidden="true">
                    <span className={s.barTrack} />
                    <span className={s.barMid} />
                    <span className={s.barFill} />
                    <span className={s.barDot} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {facts.length > 0 && (
            <section className={s.asi} aria-labelledby={`${uid}-asi`}>
              <h2 id={`${uid}-asi`} className={s.sectionHead}>
                Así es {munName}
              </h2>
              <dl className={s.facts}>
                {facts.map((f) => (
                  <div key={f.key} className={s.fact}>
                    <dt className={s.factLabel}>
                      {f.label}
                      {f.note && <span className={s.factNote}>{f.note}</span>}
                    </dt>
                    <dd className={s.factValue}>{f.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <blockquote className={s.quote}>
            <p>
              <span className={s.guill} aria-hidden="true">
                «
              </span>
              Creías estar en el percentil {guess}. Estás en el {p}.
              <span className={s.guill} aria-hidden="true">
                »
              </span>
            </p>
          </blockquote>
        </aside>
      </div>

      <footer className={cx(s.actions, s.enter, s.d4)}>
        <button type="button" className={cx(s.action, s.restart)} onClick={onRestart}>
          <span className={s.wideOnly} aria-hidden="true">
            ↺
          </span>
          Volver a empezar
        </button>
        <span className={s.shareWrap}>
          <button type="button" className={cx(s.action, s.share)} onClick={share}>
            Compartir resultado
          </button>
          <span className={s.shareNote} role="status" aria-live="polite">
            {shareNote}
          </span>
        </span>
        <button type="button" className={cx(s.action, s.method)} onClick={onMethod}>
          Cómo lo calculamos
        </button>
        <span className={s.credit}>
          Por Pablo García Guzmán ·{' '}
          <a href={CODE_URL} target="_blank" rel="noopener noreferrer">
            Código abierto
          </a>
        </span>
      </footer>
    </main>
  )
}
