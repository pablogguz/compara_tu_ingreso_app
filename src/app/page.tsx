'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import LandingPage from '@/components/LandingPage'
import QuestionFlow from '@/components/QuestionFlow'
import ResultsView from '@/components/ResultsView'
import CookieBanner from '@/components/CookieBanner'
import HelpModal from '@/components/HelpModal'
import AmbientBackground from '@/components/AmbientBackground'
import { DataProvider } from '@/lib/DataContext'
import { initGA, shouldLoadGA } from '@/lib/analytics'
import type { UserInput, CalculatedResults } from '@/types'

type Stage = 'landing' | 'questions' | 'loading' | 'results'

export default function Home() {
  const [stage, setStage] = useState<Stage>('landing')
  const [userInput, setUserInput] = useState<UserInput | null>(null)
  const [results, setResults] = useState<CalculatedResults | null>(null)

  useEffect(() => {
    if (shouldLoadGA()) initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
  }, [])

  const handleStart = () => setStage('questions')

  const handleCalculate = async (input: UserInput) => {
    setStage('loading')
    try {
      if (!input.calculationPromise) throw new Error('Calculation promise not provided')
      const calculatedResults = await input.calculationPromise
      setUserInput(input)
      setResults(calculatedResults)
      setStage('results')
    } catch (error) {
      console.error('Calculation error:', error)
      setStage('questions')
      alert('Error calculating results. Please try again.')
    }
  }

  const handleRecalculate = () => {
    setUserInput(null)
    setResults(null)
    setStage('questions')
  }

  return (
    <DataProvider>
      <AmbientBackground />
      <CookieBanner />

      {stage === 'landing' && <LandingPage onStart={handleStart} />}

      {stage === 'questions' && <QuestionFlow onCalculate={handleCalculate} />}

      {stage === 'loading' && (
        <div className="loading-stage" role="status" aria-live="polite">
          <div className="loading-ring" aria-hidden="true">
            <div className="loading-ring__inner" />
            <div className="loading-ring__core" />
          </div>
          <p className="loading-text">Calculando tus resultados</p>
          <div className="loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {stage === 'results' && userInput && results && (
        <div className="fade-in">
          <ResultsView
            userInput={userInput}
            results={results}
            onRecalculate={handleRecalculate}
          />
        </div>
      )}

      {stage !== 'landing' && <HelpModal />}

      <div className="app-credit">
        hecho con <span className="app-credit__heart" aria-hidden="true">❤️</span> por pablo garcía guzmán
      </div>

      <Analytics />
    </DataProvider>
  )
}
