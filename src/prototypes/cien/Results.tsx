'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useLevels, type Level, type Stats } from '@/prototypes/shared/useLevels'
import type { Flow } from '@/prototypes/shared/useFlow'
import { displayPercentile, euro, naturalName, pct, perceptionGap, shareText } from '@/prototypes/shared/format'
import { shareResult } from '@/prototypes/shared/share'
import { HUNDRED, Arrow, cx, stagger } from './ui'
import { householdShort, incomeShort, sentenceFor } from './copy'
import a from './App.module.css'
import s from './Results.module.css'

interface ResultsProps {
  flow: Flow
  onAgain: () => void
  onMethod: () => void
}

/** A money landmark on the big grid: "El 10 ingresa 9.713 €" … "Tú, 38.400 €". */
interface Mark {
  n: number
  value: number
  you: boolean
  /** the sentence, as shown next to the grid */
  text: string
  /** "El 10" | "Tú (86)", for the list */
  who: string
}

const LANDMARKS = [10, 50, 90]

export default function Results({ flow, onAgain, onMethod }: ResultsProps) {
  const results = flow.results!
  const code = flow.answers.municipality
  const guess = flow.answers.perceivedPercentile
  const { levels, stats, loading, error } = useLevels(results, code, guess)
  const p = displayPercentile(results.national_percentile)
  const gap = perceptionGap(results.national_percentile, guess)
  const m = flow.municipality
  const mun = m ? naturalName(m.mun_name) : 'tu municipio'
  const monthly = typeof flow.answers.monthlyIncome === 'number' ? flow.answers.monthlyIncome : 0

  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    title.current?.focus({ preventScroll: true })
  }, [])

  const [shared, setShared] = useState('')
  useEffect(() => {
    if (!shared) return
    const t = setTimeout(() => setShared(''), 2600)
    return () => clearTimeout(t)
  }, [shared])
  const share = async () => {
    const outcome = await shareResult(shareText(p))
    setShared(outcome === 'copied' ? 'Copiado' : outcome === 'shared' ? 'Compartido' : 'No se pudo copiar')
  }

  const national = levels[0]
  const marks: Mark[] = national
    ? [
        ...national.landmarks
          .filter((l) => LANDMARKS.includes(l.p))
          .map((l) => ({
            n: l.p,
            value: l.value,
            you: false,
            text: l.p === 10 ? 'ingresa' : '',
            who: `El ${l.p}`,
          })),
        { n: p, value: results.equiv_income, you: true, text: '', who: `Tú (${p})` },
      ].sort((x, y) => x.n - y.n || Number(x.you) - Number(y.you))
    : []

  return (
    <div className={a.screen}>
      <header className={a.topbar}>
        <span className={a.brand}>Compara tu ingreso</span>
        <span className={a.topNote}>
          {mun}
          <span className={s.wideOnly}>
            {' · '}
            {incomeShort(monthly, flow.answers.paymentPeriods)} · {householdShort(flow.answers.adults, flow.answers.children)}
          </span>
        </span>
      </header>

      <main className={s.main}>
        <section className={s.hero} aria-labelledby="cien-resultado">
          <div className={s.heroCopy}>
            <h1 id="cien-resultado" className={s.h1} ref={title} tabIndex={-1}>
              <span className={s.kicker}>Tu hogar es el número</span>
              <span className={s.bigMask}>
                <span className={s.big}>{p}</span>
              </span>
            </h1>
            <p className={s.sentence}>{sentenceFor(results.national_percentile, 'España')}</p>
            <p className={s.gap}>
              {gap.sentence}{' '}
              <span className={s.wideOnlyInline}>
                Tu hogar ingresa {euro(results.equiv_income)} al año por unidad de consumo.
              </span>
            </p>
          </div>

          <div className={s.heroFigure}>
            <Board p={p} guess={guess} marks={marks} />
            <ul className={s.legend}>
              {p > 1 && (
                <li>
                  <span className={cx(s.sw, s.swInk)} />
                  <span className={s.wideOnly}>Ingresan menos que tú</span>
                  <span className={s.narrowOnly}>Menos que tú</span>
                </li>
              )}
              <li>
                <span className={cx(s.sw, s.swRed)} />
                Tú
              </li>
              <li>
                <span className={cx(s.sw, s.swRing, guess === p && s.swRingOnRed, guess > p && s.swRingOnGrey)} />
                <span className={s.wideOnly}>Donde creías estar ({guess})</span>
                <span className={s.narrowOnly}>Creías ({guess})</span>
              </li>
              <li>
                <span className={cx(s.sw, s.swGrey)} />
                <span className={s.wideOnly}>Ingresan más que tú</span>
                <span className={s.narrowOnly}>Más que tú</span>
              </li>
            </ul>
            {marks.length > 0 && (
              <div className={s.marksBlock}>
                <h2 className={s.marksTitle}>Lo que ingresa cada número</h2>
                <ol className={s.marks}>
                  {marks.map((mk) => (
                    <li key={mk.who} className={cx(s.mark, mk.you && s.markYou)}>
                      <span>{mk.who}</span>
                      <span className={s.markValue}>{euro(mk.value)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className={s.figNote}>
              Ingresos netos al año por unidad de consumo, en España. El 50 está justo en medio.
            </p>
          </div>
        </section>

        {error ? (
          <p className={s.levelsError} role="status">
            No se pudieron cargar las otras escalas. Tu número en España es el {p}.
          </p>
        ) : (
          !loading && levels.length === 3 && <LevelsBand levels={levels} />
        )}

        {!loading && stats && <Facts mun={mun} stats={stats} />}

        <div className={s.actions}>
          <button type="button" className={cx(a.btn, a.btnOutline, s.again)} onClick={onAgain}>
            Otra vez
          </button>
          <button type="button" className={cx(a.btn, s.share)} onClick={share}>
            Compartir
          </button>
          <span className={s.shared} role="status" aria-live="polite">
            {shared}
          </span>
          <button type="button" className={s.how} onClick={onMethod}>
            Cómo se calcula
            <Arrow className={s.howIcon} />
          </button>
        </div>

        <p className={s.source}>
          Fuente: INE, Atlas de Distribución de Renta de los Hogares (renta de 2023, proyectada a 2024) y Censo anual de
          población. Es una estimación: el método suaviza los extremos de la distribución.
        </p>
      </main>
    </div>
  )
}

/* ---- the big grid, with the money landmarks at the end of their rows ---- */

function Board({ p, guess, marks }: { p: number; guess: number; marks: Mark[] }) {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const label =
    `Cien cuadrados ordenados de menos a más ingresos. El tuyo es el ${p}, en rojo` +
    (p > 1 ? `; los de antes, en negro, tienen menos ingresos` : '') +
    `; los ${100 - p} siguientes, en gris, más. ` +
    (guess === p ? `Acertaste: creías ser el ${guess}.` : `Tu estimación, el ${guess}, lleva un anillo rojo.`)

  return (
    <div className={s.board} role="img" aria-label={label} style={{ ['--p' as string]: p } as React.CSSProperties}>
      {rows.map((r) => {
        const inRow = marks.filter((mk) => Math.floor((mk.n - 1) / 10) === r)
        return (
          <Fragment key={r}>
            {HUNDRED.slice(r * 10, r * 10 + 10).map((n) => (
              <span
                key={n}
                className={cx(
                  s.sq,
                  n < p && s.sqBelow,
                  n === p && s.sqYou,
                  n > p && s.sqAbove,
                  n === guess && s.sqGuess
                )}
                style={stagger(n - 1)}
              />
            ))}
            <span className={s.rowNote}>
              {inRow.map((mk) => (
                <span key={mk.who} className={cx(s.note, mk.you && s.noteYou)}>
                  <span className={s.noteWho}>{mk.you ? 'Tú' : `El ${mk.n}`}</span>
                  {mk.text ? ` ${mk.text} ` : ', '}
                  <b className={s.noteValue}>{euro(mk.value)}</b>
                </span>
              ))}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

/* ---- España / provincia / municipio ---- */

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [state, setState] = useState<'idle' | 'armed' | 'in'>('idle')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('in')
          io.disconnect()
        } else setState((st) => (st === 'idle' ? 'armed' : st))
      },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, state] as const
}

function levelName(l: Level, levels: Level[]): string {
  if (l.key !== 'municipal') return l.label
  // "Madrid (municipio)" when the municipality shares the province's name
  return levels[1] && levels[1].place === l.place ? `${l.place} (municipio)` : l.label
}

function LevelsBand({ levels }: { levels: Level[] }) {
  const [ref, state] = useReveal<HTMLElement>()
  return (
    <section
      ref={ref}
      className={cx(s.levels, state === 'armed' && s.armed, state === 'in' && s.in)}
      aria-labelledby="cien-escalas"
    >
      <h2 id="cien-escalas" className={s.h2}>
        <span className={s.wideOnly}>El mismo hogar, en tres escalas</span>
        <span className={s.narrowOnly}>En tres escalas</span>
      </h2>
      <ul className={s.levelList}>
        {levels.map((l, i) => (
          <li key={l.key} className={s.level} style={{ ['--p' as string]: l.percentile, ...stagger(i) } as React.CSSProperties}>
            <div className={s.mini} aria-hidden="true">
              {HUNDRED.map((n) => (
                <span
                  key={n}
                  className={cx(s.miniSq, n < l.percentile && s.miniBelow, n === l.percentile && s.miniYou)}
                  style={{ ['--j' as string]: n - 1 } as React.CSSProperties}
                />
              ))}
            </div>
            <div className={s.levelText}>
              <span className={s.levelMask}>
                <span className={cx(s.levelNum, i === 0 && s.levelNumFirst)}>
                  <span className={a.srOnly}>Número </span>
                  {l.percentile}
                </span>
              </span>
              <span className={s.levelName}>{levelName(l, levels)}</span>
              <span className={s.levelMid}>El 50, {euro(l.median)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---- Así es <municipio> ---- */

function Facts({ mun, stats }: { mun: string; stats: Stats }) {
  const note = (year: number, imputed: number) => (imputed === 1 ? `(${year}, media provincial)` : `(${year})`)
  const facts = [
    {
      value: euro(stats.net_income_equiv),
      label: `Renta media por unidad de consumo ${note(2024, stats.net_income_equiv_is_imputed)}`,
    },
    {
      value: pct(stats.pct_higher_ed_completed),
      label: `Con estudios superiores, 15 y más años ${note(2023, stats.pct_higher_ed_completed_is_imputed)}`,
    },
    {
      value: pct(stats.pct_foreign_born),
      label: `Nacidos en el extranjero ${note(2024, stats.pct_foreign_born_is_imputed)}`,
    },
  ]
  return (
    <section className={s.facts} aria-labelledby="cien-asi">
      <h2 id="cien-asi" className={cx(s.h2, s.factsTitle)}>
        Así es {mun}
      </h2>
      <dl className={s.factList}>
        {facts.map((f) => (
          <div key={f.label} className={s.fact}>
            <dt className={s.factLabel}>{f.label}</dt>
            <dd className={s.factValue}>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
