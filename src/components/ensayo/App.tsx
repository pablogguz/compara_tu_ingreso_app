'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { DataProvider } from '@/lib/DataContext'
import { initGA, shouldLoadGA } from '@/lib/analytics'
import CookieBanner from '@/components/CookieBanner'
import HelpModal, { openHelp } from '@/components/HelpModal'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useFlow, type Flow } from '@/hooks/useFlow'
import { useLevels } from '@/hooks/useLevels'
import { euro, naturalName } from '@/lib/format'
import Questions from './Questions'
import Story from './Story'
import Summary from './Summary'
import HeroField from './HeroField'
import { cx, householdText, incomeText } from './copy'
import { useReducedMotion } from './hooks'
import a from './App.module.css'
import q from './Questions.module.css'

// The site: an explorable essay. An opening, one question and a way in
// ("Comenzar"); then the four questions, alone on the screen; then a
// scrollytelling figure where your hundred squares become the income curve;
// then a summary. Help (data, method, FAQ) lives in the HelpModal.
//
// The cookie banner, the help dialog and its button sit outside the essay's
// root so they keep the site's global styles.
export default function EnsayoApp() {
  useEffect(() => {
    if (shouldLoadGA()) initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
  }, [])

  return (
    <DataProvider>
      <CookieBanner />
      <Ensayo />
      <HelpModal />
      <Analytics />
    </DataProvider>
  )
}

const TITLE = 'Descubre tu posición en la distribución de la renta'

function Ensayo() {
  const flow = useFlow({ logResponses: true })
  const [step, setStep] = useState(0)
  // the questions appear once the reader asks for them
  const [started, setStarted] = useState(false)
  const scrollOnStart = useRef(false)
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

  const start = () => {
    if (started) {
      toQuestions(true)
      return
    }
    scrollOnStart.current = true
    setStarted(true)
  }

  // once the questions have mounted, bring them in and focus the first one
  useEffect(() => {
    if (!started || !scrollOnStart.current) return
    scrollOnStart.current = false
    toQuestions(true)
  }, [started, toQuestions])

  const toIntro = () =>
    document.getElementById('introduccion')?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })

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
          <button type="button" className={a.barButton} onClick={() => openHelp()}>
            Ayuda y metodología
          </button>
        </div>
      </div>

      <article>
        <header className={cx(a.flow, a.header)}>
          <div className={a.heroBody}>
            <h1 className={cx(a.title, a.titleWide)}>
              {TITLE.split(' ').map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && ' '}
                  <span className={a.word}>
                    <span className={a.wordIn} style={{ ['--w' as string]: i } as React.CSSProperties}>
                      {word}
                    </span>
                  </span>
                </Fragment>
              ))}
            </h1>
            <p className={a.standfirst}>
              Compara los ingresos de tu hogar con los del resto de España a partir de datos administrativos de las
              declaraciones de IRPF.
            </p>
          </div>
          <div className={cx(a.full, a.heroField)}>
            <HeroField />
          </div>
          <button type="button" className={a.scrollCue} onClick={toIntro}>
            Desliza hacia abajo
            <span className={a.scrollArrow} aria-hidden="true">
              ↓
            </span>
          </button>
        </header>

        <section id="introduccion" className={cx(a.flow, a.intro)} aria-label="Introducción">
          <div>
            <p className={a.introLead}>
              Si pusiéramos en fila a todas las personas que viven en España, de la que tiene menos ingresos a la que
              más, ¿en qué punto de la fila estarías tú?
            </p>
            <p className={a.introSub}>
              Con cuatro preguntas sobre tu hogar, puedes descubrir en qué punto de la fila te encuentras tú.
            </p>
            <div className={a.introActions}>
              <button type="button" className={a.btn} onClick={start}>
                Comenzar
                <span className={a.btnArrow} aria-hidden="true">
                  →
                </span>
              </button>
              <span className={a.introNote}>Las cuentas se hacen en tu navegador.</span>
            </div>
          </div>
        </section>

        {started && (
          <section
            id="preguntas"
            className={cx(a.flow, a.section, !done && a.stage)}
            aria-labelledby="ensayo-preguntas"
          >
            <h2 className={a.srOnly} id="ensayo-preguntas">
              Cuatro preguntas
            </h2>

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
        )}

        {done && (
          <ErrorBoundary label="ensayo-resultados">
            <Results flow={flow} reduced={reduced} onAgain={again} />
          </ErrorBoundary>
        )}

        <section className={cx(a.flow, a.section)} aria-label="Cómo se calcula">
          <p className={a.lede}>
            ¿De dónde salen los datos y cómo se calcula todo esto?{' '}
            <button type="button" className={a.inlineButton} onClick={() => openHelp('metodologia')}>
              Metodología y preguntas frecuentes
            </button>
            .
          </p>
        </section>
      </article>

      <footer className={cx(a.flow)}>
        <div className={cx(a.wide, a.footer)}>
          <div className={a.footerRow}>
            <span>
              Compara tu ingreso · comparatuingreso.es ·{' '}
              <a href="https://github.com/pablogguz/compara_tu_ingreso_app" target="_blank" rel="noopener noreferrer">
                Código abierto
              </a>
            </span>
            <span>
              hecho por pablo con{' '}
              <span role="img" aria-label="cariño">
                ❤️
              </span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// the loading mark: sixteen people, lightest to darkest, and you hopping between them
const SPINNER = Array.from({ length: 16 }, (_, k) => k)
const SPINNER_COLOR = SPINNER.map((k) => {
  const from = [0xe2, 0xe6, 0xec]
  const to = [0x3f, 0x4c, 0x63]
  return `rgb(${from.map((v, i) => Math.round(v + ((to[i] - v) * k) / 15)).join(',')})`
})

function Loading() {
  const ref = useRef<HTMLDivElement>(null)
  // the questions it replaces were taller: bring the section back to the top,
  // so the mark sits where the questions were
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > window.innerHeight) {
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ;(el.closest('section') ?? el).scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' })
    }
  }, [])
  return (
    <div ref={ref} className={q.loading} role="status">
      <div className={q.spinner} aria-hidden="true">
        {SPINNER.map((k) => (
          <span
            key={k}
            className={q.spinSq}
            style={{ background: SPINNER_COLOR[k], ['--d' as string]: (k % 4) + Math.floor(k / 4) } as React.CSSProperties}
          />
        ))}
        <span className={q.spinYou} />
      </div>
      <p className={q.loadingLine}>Calculando…</p>
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
        guessValue={guessValue ?? levels[0].percentiles[guess - 1]}
        onAgain={onAgain}
      />
    </>
  )
}
