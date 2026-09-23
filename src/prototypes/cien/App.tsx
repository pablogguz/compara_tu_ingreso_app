'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DataProvider } from '@/lib/DataContext'
import { useFlow } from '@/prototypes/shared/useFlow'
import { displayPercentile } from '@/prototypes/shared/format'
import Landing from './Landing'
import Question from './Question'
import StepPlace from './StepPlace'
import StepIncome from './StepIncome'
import StepHousehold from './StepHousehold'
import StepGuess from './StepGuess'
import Results from './Results'
import Method from './Method'
import { HUNDRED, cx, stagger } from './ui'
import { sentenceFor } from './copy'
import s from './App.module.css'

// C · Cien — "Si España fuera 100 personas, ¿cuál serías tú?"
// landing → four questions (one per screen) → the hundred fill → the poster.
export default function CienApp() {
  return (
    <DataProvider>
      <Cien />
    </DataProvider>
  )
}

type Phase = 'landing' | 'questions' | 'calc'

const TOPICS = ['Municipio', 'Ingresos', 'Hogar', 'Tu número']

function Cien() {
  const flow = useFlow()
  const [phase, setPhase] = useState<Phase>('landing')
  const [step, setStep] = useState(0)
  // the guess has no default on screen: the user has to pick a square
  const [guessTouched, setGuessTouched] = useState(false)
  const [methodOpen, setMethodOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const view = phase === 'calc' ? flow.status : phase
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [view, step])

  // announce the result once, politely, when the poster appears
  useEffect(() => {
    if (flow.status === 'done' && flow.results) {
      const p = displayPercentile(flow.results.national_percentile)
      const t = setTimeout(
        () => setAnnouncement(`Tu hogar es el número ${p}. ${sentenceFor(flow.results!.national_percentile, 'España')}`),
        400
      )
      return () => clearTimeout(t)
    }
    setAnnouncement('')
  }, [flow.status, flow.results])

  const valid = [
    !!flow.municipality,
    flow.income.state === 'valid' || flow.income.state === 'warning',
    true,
    guessTouched,
  ]

  const next = useCallback(async () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    // every answer must hold before calculating; send the user to the first gap
    const gap = [!!flow.municipality, flow.income.state === 'valid' || flow.income.state === 'warning'].indexOf(false)
    if (gap !== -1) {
      setStep(gap)
      return
    }
    setPhase('calc')
    await flow.calculate()
  }, [step, flow])

  const back = () => {
    if (step === 0) setPhase('landing')
    else setStep(step - 1)
  }

  const again = () => {
    flow.reset()
    setStep(0)
    setPhase('questions')
  }

  const review = () => {
    flow.reset()
    setStep(3)
    setPhase('questions')
  }

  let screen: React.ReactNode
  if (phase === 'landing') {
    screen = (
      <Landing
        onStart={() => {
          setStep(0)
          setPhase('questions')
        }}
        onMethod={() => setMethodOpen(true)}
      />
    )
  } else if (phase === 'questions') {
    screen = (
      <Question
        step={step}
        topic={TOPICS[step]}
        valid={valid[step]}
        onBack={back}
        onNext={next}
        nextLabel={step === 3 ? 'Ver mi número' : 'Siguiente'}
        layout={step === 3 ? 'guess' : step === 2 ? 'wide' : 'default'}
      >
        {(attempted) =>
          step === 0 ? (
            <StepPlace flow={flow} attempted={attempted} />
          ) : step === 1 ? (
            <StepIncome flow={flow} attempted={attempted} />
          ) : step === 2 ? (
            <StepHousehold flow={flow} />
          ) : (
            <StepGuess
              value={flow.answers.perceivedPercentile}
              touched={guessTouched}
              attempted={attempted}
              onPick={(n) => {
                flow.set('perceivedPercentile', n)
                setGuessTouched(true)
              }}
            />
          )
        }
      </Question>
    )
  } else if (flow.status === 'done' && flow.results) {
    screen = <Results flow={flow} onAgain={again} onMethod={() => setMethodOpen(true)} />
  } else if (flow.status === 'error') {
    screen = <ErrorScreen message={flow.error} onRetry={() => flow.calculate()} onReview={review} />
  } else {
    screen = <Loading />
  }

  return (
    <div className={s.root}>
      {screen}
      <Method open={methodOpen} onClose={() => setMethodOpen(false)} />
      <div className={s.srOnly} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className={s.screen}>
      <header className={s.topbar}>
        <span className={s.brand}>Compara tu ingreso</span>
      </header>
      <div className={s.loadBody} role="status">
        <p className={s.loadTitle}>Colocándote entre cien…</p>
        <div className={s.loadGrid} aria-hidden="true">
          {HUNDRED.map((n) => (
            <span key={n} className={s.loadSq} style={stagger(n - 1)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({
  message,
  onRetry,
  onReview,
}: {
  message: string | null
  onRetry: () => void
  onReview: () => void
}) {
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => title.current?.focus({ preventScroll: true }), [])
  return (
    <div className={s.screen}>
      <header className={s.topbar}>
        <span className={s.brand}>Compara tu ingreso</span>
      </header>
      <div className={s.errorBody} role="alert">
        <h1 className={s.errorTitle} ref={title} tabIndex={-1}>
          No hemos podido colocarte
        </h1>
        <p className={s.errorText}>{message ?? 'No se pudieron calcular los resultados. Inténtalo de nuevo.'}</p>
        <div className={s.errorActions}>
          <button type="button" className={s.btn} onClick={onRetry}>
            Reintentar
          </button>
          <button type="button" className={cx(s.btn, s.btnOutline)} onClick={onReview}>
            Revisar respuestas
          </button>
        </div>
      </div>
    </div>
  )
}
