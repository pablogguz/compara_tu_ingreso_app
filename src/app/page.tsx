'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import QuestionFlow from '@/components/QuestionFlow'
import ResultsView from '@/components/ResultsView'
import CookieBanner from '@/components/CookieBanner'
import HelpModal from '@/components/HelpModal'
import { UserInput, CalculatedResults } from '@/types'
import { initGA, shouldLoadGA } from '@/lib/analytics'

export default function Home() {
  const [showLanding, setShowLanding] = useState(true)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [userInput, setUserInput] = useState<UserInput | null>(null)
  const [results, setResults] = useState<CalculatedResults | null>(null)

  // Initialize GA if consent already granted
  useEffect(() => {
    if (shouldLoadGA()) {
      initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
    }
  }, [])

  const handleStart = () => {
    setShowLanding(false)
    setShowQuestions(true)
  }

  const handleCalculate = (input: UserInput, calculatedResults: CalculatedResults) => {
    setUserInput(input)
    setResults(calculatedResults)
    setShowQuestions(false)
    setShowResults(true)
  }

  return (
    <>
      <CookieBanner />
      
      {showLanding && <LandingPage onStart={handleStart} />}
      
      {showQuestions && (
        <QuestionFlow onCalculate={handleCalculate} />
      )}
      
      {showResults && userInput && results && (
        <ResultsView userInput={userInput} results={results} />
      )}
      
      {/* Help Modal - always visible after landing */}
      {!showLanding && <HelpModal />}
    </>
  )
}
