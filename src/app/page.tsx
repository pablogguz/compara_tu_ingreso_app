'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import QuestionFlow from '@/components/QuestionFlow'
import ResultsView from '@/components/ResultsView'
import CookieBanner from '@/components/CookieBanner'
import HelpModal from '@/components/HelpModal'
import Footer from '@/components/Footer'
import { UserInput, CalculatedResults } from '@/types'
import { initGA, shouldLoadGA } from '@/lib/analytics'

export default function Home() {
  const [showLanding, setShowLanding] = useState(true)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

  const handleCalculate = async (input: UserInput) => {
    // Immediately show spinner and hide questions
    setShowQuestions(false)
    setIsLoading(true)
    
    try {
      // Perform calculations during spinner time
      if (!input.calculationPromise) {
        throw new Error('Calculation promise not provided')
      }
      
      const calculatedResults = await input.calculationPromise
      
      setUserInput(input)
      setResults(calculatedResults)
      
      // Ensure minimum spinner time for smooth UX (at least 1 second)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Set results to show first, then hide loading to prevent content gap
      setShowResults(true)
      
      // Use requestAnimationFrame to ensure DOM update before hiding spinner
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
      setIsLoading(false)
    } catch (error) {
      console.error('Calculation error:', error)
      setIsLoading(false)
      setShowQuestions(true)
      alert('Error calculating results. Please try again.')
    }
  }

  return (
    <>
      <CookieBanner />
      
      {showLanding && <LandingPage onStart={handleStart} />}
      
      {showQuestions && (
        <QuestionFlow onCalculate={handleCalculate} />
      )}
      
      {isLoading && !showResults && (
        <div className="loading-container">
          <div className="spinner-wrapper">
            <div className="spinner-outer"></div>
            <div className="spinner-inner"></div>
            <div className="spinner-dot"></div>
          </div>
          <p className="loading-text">Calculando tus resultados...</p>
        </div>
      )}
      
      {showResults && userInput && results && (
        <div className="fade-in">
          <ResultsView userInput={userInput} results={results} />
        </div>
      )}
      
      {/* Help Modal - always visible after landing */}
      {!showLanding && <HelpModal />}
      
      {/* Footer - always visible */}
      <Footer />
    </>
  )
}
