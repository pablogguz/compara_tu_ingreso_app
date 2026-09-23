'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import LandingPage from '@/components/LandingPage'
import QuestionFlow from '@/components/QuestionFlow'
import ResultsView from '@/components/ResultsView'
import CookieBanner from '@/components/CookieBanner'
import HelpModal, { type HelpTabId } from '@/components/HelpModal'
import AmbientBackground from '@/components/AmbientBackground'
import { DataProvider } from '@/lib/DataContext'
import { initGA, shouldLoadGA } from '@/lib/analytics'
import { runViewTransition } from '@/lib/viewTransition'
import type { QuestionFlowState } from '@/hooks/useQuestionFlow'
import type { UserInput, CalculatedResults, ViewType } from '@/types'

export type Stage = 'landing' | 'questions' | 'loading' | 'results'

/** Where the app starts. The real site always starts on the landing; the
 *  /mocks screens boot straight into any stage with fixture data. */
export interface AppBoot {
  stage?: Stage
  questions?: Partial<QuestionFlowState>
  userInput?: UserInput
  results?: CalculatedResults
  resultsView?: ViewType
  helpOpen?: boolean
  helpTab?: HelpTabId
  cookiePreview?: boolean
}

interface AppProps {
  boot?: AppBoot
  /** Mock mode: no analytics, no sheet logging, no stored cookie consent. */
  mock?: boolean
}

// The loading beat stays up at least this long, so on a warm cache the ring
// reads as a moment rather than a one-frame flash.
export const MIN_LOADING_MS = 800

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function App({ boot = {}, mock = false }: AppProps) {
  const [stage, setStage] = useState<Stage>(boot.stage ?? 'landing')
  const [userInput, setUserInput] = useState<UserInput | null>(boot.userInput ?? null)
  const [results, setResults] = useState<CalculatedResults | null>(boot.results ?? null)

  useEffect(() => {
    if (!mock && shouldLoadGA()) initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
  }, [mock])

  const go = (next: Stage, apply?: () => void) =>
    runViewTransition(() => {
      apply?.()
      setStage(next)
      if (typeof window !== 'undefined' && window.scrollY > 0) window.scrollTo(0, 0)
    }, 'stage')

  const handleCalculate = async (input: UserInput) => {
    go('loading')
    try {
      if (!input.calculationPromise) throw new Error('Calculation promise not provided')
      const [calculated] = await Promise.all([input.calculationPromise, wait(MIN_LOADING_MS)])
      go('results', () => {
        setUserInput(input)
        setResults(calculated)
      })
    } catch (error) {
      console.error('Calculation error:', error)
      go('questions')
      alert('No se pudieron calcular los resultados. Inténtalo de nuevo.')
    }
  }

  const handleRecalculate = () =>
    go('questions', () => {
      setUserInput(null)
      setResults(null)
    })

  return (
    <DataProvider>
      <AmbientBackground />
      {mock ? boot.cookiePreview && <CookieBanner preview /> : <CookieBanner />}

      <div className="stage">
        {stage === 'landing' && <LandingPage onStart={() => go('questions')} />}

        {stage === 'questions' && (
          <QuestionFlow
            onCalculate={handleCalculate}
            initialState={boot.questions}
            logResponses={!mock}
          />
        )}

        {stage === 'loading' && (
          <div className="loading-stage" role="status" aria-live="polite">
            <div className="loading-ring" aria-hidden="true">
              <div className="loading-ring__inner" />
              <div className="loading-ring__core" />
            </div>
            <p className="loading-text">Calculando tus resultados</p>
            <p className="loading-hint">
              Comparando tu hogar con millones de declaraciones
            </p>
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {stage === 'results' && userInput && results && (
          <ResultsView
            userInput={userInput}
            results={results}
            onRecalculate={handleRecalculate}
            initialView={boot.resultsView}
          />
        )}
      </div>

      {stage !== 'landing' && (
        <HelpModal defaultOpen={boot.helpOpen} defaultTab={boot.helpTab} />
      )}

      <div className="app-credit">
        hecho con{' '}
        <span className="app-credit__heart" aria-hidden="true">
          ❤️
        </span>{' '}
        por pablo garcía guzmán
      </div>

      {!mock && <Analytics />}
    </DataProvider>
  )
}
