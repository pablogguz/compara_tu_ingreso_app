'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DataProvider } from '@/lib/DataContext'
import { useFlow, type Flow } from '@/prototypes/shared/useFlow'
import { useLevels } from '@/prototypes/shared/useLevels'
import { euro, naturalName } from '@/prototypes/shared/format'
import Questions from './Questions'
import Story from './Story'
import Summary from './Summary'
import Method from './Method'
import Sidenote from './Sidenote'
import { cx, householdText, incomeText } from './copy'
import { useReducedMotion } from './hooks'
import a from './App.module.css'
import q from './Questions.module.css'

// D · Ensayo — an explorable essay. Opening and four questions; then a
// scrollytelling figure where your hundred squares become the income curve;
// then a summary, the method and the references.
export default function EnsayoApp() {
  return (
    <DataProvider>
      <Ensayo />
    </DataProvider>
  )
}

const HUNDRED = Array.from({ length: 100 }, (_, i) => i)

function Ensayo() {
  const flow = useFlow()
  const [step, setStep] = useState(0)
  // the guess has no default on screen: the reader has to choose
  const [guessTouched, setGuessTouched] = useState(false)
  const reduced = useReducedMotion()
  const done = flow.status === 'done' && !!flow.results

  const calculate = useCallback(async () => {
    const incomeOk = flow.income.state === 'valid' || flow.income.state === 'warning'
    const gap = [!!flow.municipality, incomeOk, true, guessTouched].indexOf(false)
    if (gap !== -1) {
      setStep(gap)
      return
    }
    await flow.calculate()
  }, [flow, guessTouched])

  const toQuestions = useCallback(
    (focus: boolean) => {
      const el = document.getElementById('preguntas')
      el?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      if (focus) {
        setTimeout(() => document.querySelector<HTMLElement>('#preguntas form input')?.focus({ preventScroll: true }), reduced ? 0 : 450)
      }
    },
    [reduced]
  )

  const again = () => {
    flow.reset()
    setStep(0)
    requestAnimationFrame(() => toQuestions(true))
  }

  return (
    <div className={a.root}>
      <div className={cx(a.flow, a.masthead)}>
        <div className={cx(a.wide, a.bar)}>
          <span className={a.brand}>Compara tu ingreso</span>
          <a className={a.barLink} href="/prototipos/">
            Prototipo D · Ensayo
          </a>
        </div>
      </div>

      <article>
        <header className={cx(a.flow, a.header)}>
          <p className={a.kicker}>
            <span className={a.nowrap}>Una explicación interactiva</span>
            <span className={a.kickerDot}>·</span>
            <span className={a.nowrap}>Datos del INE, 2024</span>
          </p>
          <h1 className={cx(a.title, a.titleWide)}>¿Dónde estás tú en la distribución de la renta?</h1>
          <p className={a.standfirst}>
            Casi todo el mundo se imagina en el medio. Con cuatro preguntas y la renta de los 37.072 barrios de España, te
            enseñamos dónde estás de verdad: primero entre cien personas, después en la curva de la renta del país, de tu
            provincia y de tu municipio.
          </p>
          <div className={a.start}>
            <button type="button" className={a.btn} onClick={() => toQuestions(true)}>
              Empezar
              <span className={a.btnArrow} aria-hidden="true">
                ↓
              </span>
            </button>
            <span className={a.startNote}>Cuatro preguntas y cinco minutos de lectura</span>
          </div>
          <p className={a.byline}>
            <span>
              Por <strong>Pablo García Guzmán</strong>
            </span>
            <span>Septiembre de 2026</span>
            <span>Datos: INE, Atlas de Distribución de Renta de los Hogares</span>
          </p>
        </header>

        <section className={cx(a.flow, a.prose)} aria-label="Introducción">
          <figure className={a.hook} aria-labelledby="ensayo-fig1">
            <div className={a.hookGrid} aria-hidden="true">
              {HUNDRED.map((i) => (
                <span key={i} className={a.hookSq} style={{ ['--i' as string]: i } as React.CSSProperties} />
              ))}
            </div>
            <figcaption className={a.caption} id="ensayo-fig1">
              <b>Figura 1.</b> España, reducida a cien personas. Cada cuadrado es el 1 % de la población. Una de ellas
              eres tú.
            </figcaption>
          </figure>

          <div className={a.text}>
          <p>
            Si pusiéramos en fila a todas las personas que viven en España,
            <Sidenote n={1} title="¿Por qué personas y no hogares?">
              Cada persona cuenta una vez, viva sola o con cuatro más, con la renta de su hogar por unidad de
              consumo. Por eso hablamos de «la población» y no de «los hogares».
            </Sidenote>{' '}
            de la que vive en el hogar con menos ingresos a la que vive en el que más, ¿en qué punto de la fila
            estarías tú? Es difícil saberlo desde dentro: tendemos a imaginarnos cerca del medio, estemos donde
            estemos.
            <Sidenote n={2}>
              Es un resultado conocido: quien vive en un hogar con pocos ingresos suele creerse más arriba de lo que
              está, y quien vive en uno con muchos, más abajo (Cruces, Perez-Truglia y Tetaz, 2013).
            </Sidenote>
          </p>
          <p>
            Aquí no hace falta imaginar. El INE publica la renta de cada barrio de España a partir de las declaraciones
            de la renta,
            <Sidenote n={3} title="¿De dónde salen los datos?">
              Del Atlas de Distribución de Renta de los Hogares del INE: la renta de las 37.072 secciones censales,
              barrios de unas 1.300 personas. Datos de 2023, llevados a 2024.
            </Sidenote>{' '}
            y con eso se puede reconstruir la fila entera. Primero, cuatro preguntas sobre tu hogar. Después, figura a
            figura, verás cómo se pasa de cien personas a la curva de la renta del país, y dónde estás tú en ella.
          </p>
          </div>
        </section>

        <section id="preguntas" className={cx(a.flow, a.section)} aria-labelledby="ensayo-preguntas">
          <div className={a.sectionHead}>
            <span className={a.secNum}>1</span>
            <h2 className={a.h2} id="ensayo-preguntas">
              Cuatro preguntas
            </h2>
          </div>
          <p className={a.lede}>
            Una cada vez. No guardamos tus respuestas: las cuentas se hacen en tu navegador.
          </p>

          {flow.status === 'calculating' ? (
            <Loading />
          ) : done ? (
            <Record flow={flow} onEdit={again} />
          ) : (
            <Questions
              flow={flow}
              step={step}
              onStep={setStep}
              guessTouched={guessTouched}
              onGuess={(n) => {
                flow.set('perceivedPercentile', n)
                setGuessTouched(true)
              }}
              onCalculate={calculate}
              error={flow.status === 'error' ? flow.error : null}
            />
          )}
        </section>

        {done && <Results flow={flow} reduced={reduced} onAgain={again} />}

        <Method
          number={done ? 4 : 2}
          household={
            done ? { adults: flow.answers.adults, children: flow.answers.children, equivIncome: flow.equivIncome } : null
          }
        />
      </article>

      <footer className={cx(a.flow)}>
        <div className={cx(a.wide, a.footer)}>
          <div className={a.footerRow}>
            <span>Compara tu ingreso · comparatuingreso.es</span>
            <span>Prototipo D · Ensayo. No guarda respuestas ni carga analítica.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Loading() {
  const ref = useRef<HTMLDivElement>(null)
  // the questions it replaces were taller: keep the line in view
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > window.innerHeight) {
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView?.({ block: 'center', behavior: still ? 'auto' : 'smooth' })
    }
  }, [])
  return (
    <div ref={ref} className={q.loading} role="status">
      <p className={q.loadingLine}>Estamos poniendo en fila a toda la población de España, de menos a más ingresos…</p>
      <div className={q.loadingBar} aria-hidden="true" />
    </div>
  )
}

function Record({ flow, onEdit }: { flow: Flow; onEdit: () => void }) {
  const m = flow.municipality
  const monthly = typeof flow.answers.monthlyIncome === 'number' ? flow.answers.monthlyIncome : 0
  return (
    <div className={q.record}>
      <div className={q.recordHead}>
        <p className={q.recordTitle}>Tus respuestas</p>
        <button type="button" className={cx(a.btn, a.btnQuiet)} onClick={onEdit}>
          Cambiarlas
        </button>
      </div>
      <dl className={q.recordList}>
        <dt>Municipio</dt>
        <dd>{m ? `${naturalName(m.mun_name)} (${naturalName(m.prov_name)})` : '—'}</dd>
        <dt>Ingresos</dt>
        <dd>{incomeText(monthly, flow.answers.paymentPeriods)}</dd>
        <dt>Hogar</dt>
        <dd>{householdText(flow.answers.adults, flow.answers.children)}</dd>
        <dt>Estimación</dt>
        <dd className={q.recordGuess}>{flow.answers.perceivedPercentile} de cada 100 por debajo de ti</dd>
      </dl>
      {flow.equivIncome !== null && (
        <p className={q.recordEquiv}>
          Renta de tu hogar por unidad de consumo: <strong>{euro(flow.equivIncome)} al año</strong>
        </p>
      )}
    </div>
  )
}

function Results({ flow, reduced, onAgain }: { flow: Flow; reduced: boolean; onAgain: () => void }) {
  const results = flow.results!
  const guess = flow.answers.perceivedPercentile
  const { levels, stats, loading, error, guessValue } = useLevels(results, flow.answers.municipality, guess)
  const ready = !loading && !error && levels.length === 3
  const scrolled = useRef(false)

  // once the figures are ready, take the reader to the story
  useEffect(() => {
    if (!ready || scrolled.current) return
    scrolled.current = true
    const h = document.getElementById('ensayo-historia')
    if (!h) return
    h.focus({ preventScroll: true })
    requestAnimationFrame(() =>
      h.closest('section')?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    )
  }, [ready, reduced])

  if (error) {
    return (
      <section className={cx(a.flow, a.section)}>
        <p className={q.error} role="alert">
          <span>
            <strong>No se pudieron cargar las figuras.</strong> Aun así, tu hogar está en el percentil{' '}
            {Math.min(99, Math.max(1, results.national_percentile))} en España.
          </span>
        </p>
      </section>
    )
  }
  if (!ready) {
    return (
      <section className={cx(a.flow, a.section)}>
        <p className={q.loadingLine} role="status">
          Preparando las figuras…
        </p>
      </section>
    )
  }

  return (
    <>
      <Story
        levels={levels}
        rawNational={results.national_percentile}
        guess={guess}
        income={results.equiv_income}
        guessValue={guessValue ?? levels[0].percentiles[guess - 1]}
      />
      <Summary
        levels={levels}
        stats={stats}
        income={results.equiv_income}
        rawNational={results.national_percentile}
        guess={guess}
        onAgain={onAgain}
      />
    </>
  )
}
