'use client'

import { useCallback, useMemo, useState } from 'react'
import type { CalculatedResults, Municipality } from '@/types'
import { calculateEquivIncome, equivalenceScale } from '@/lib/calculations'
import { computeResults, monthlyIncomeIn12 } from '@/lib/computeResults'
import { useMunicipalities, findMunicipality } from '@/lib/DataContext'
import { validateMonthlyIncome, type IncomeValidation } from '@/lib/validation'
import { logResponseToSheet } from '@/lib/sheetLogger'

export interface Answers {
  municipality: string
  monthlyIncome: number | ''
  paymentPeriods: 12 | 14
  adults: number
  children: number
  /** 1…99 */
  perceivedPercentile: number
}

export const DEFAULT_ANSWERS: Answers = {
  municipality: '',
  monthlyIncome: '',
  paymentPeriods: 12,
  adults: 1,
  children: 0,
  perceivedPercentile: 50,
}

export const LIMITS = {
  adults: { min: 1, max: 20 },
  children: { min: 0, max: 20 },
  perceived: { min: 1, max: 99 },
} as const

export type FlowStatus = 'idle' | 'calculating' | 'done' | 'error'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface Flow {
  answers: Answers
  set: <K extends keyof Answers>(key: K, value: Answers[K]) => void
  /** the selected municipality, once the lookup has loaded */
  municipality: Municipality | undefined
  /** the municipality list is still loading */
  loadingMunicipalities: boolean
  income: IncomeValidation
  /** every answer is present and valid */
  canCalculate: boolean
  /** monthly × pagas */
  annualIncome: number | null
  /** modified OECD consumption units */
  units: number
  /** annual income per consumption unit (what the percentiles are measured in) */
  equivIncome: number | null
  status: FlowStatus
  results: CalculatedResults | null
  error: string | null
  /** runs the calculation; with `logResponses`, appends the answers to the
   *  research sheet (only if the visitor accepted cookies) */
  calculate: () => Promise<CalculatedResults | null>
  /** back to editing; the answers are kept */
  reset: () => void
}

interface FlowOptions {
  initial?: Partial<Answers>
  minLoadingMs?: number
  /** append each calculation to the research sheet (the sheet logger itself
   *  checks for cookie consent) */
  logResponses?: boolean
}

// Answers, validation and the calculation.
export function useFlow(options: FlowOptions = {}): Flow {
  const { initial, minLoadingMs = 900, logResponses = false } = options
  const { municipalities, loading } = useMunicipalities()
  const [answers, setAnswers] = useState<Answers>(() => ({ ...DEFAULT_ANSWERS, ...initial }))
  const [status, setStatus] = useState<FlowStatus>('idle')
  const [results, setResults] = useState<CalculatedResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = useCallback(<K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((a) => ({ ...a, [key]: value }))
  }, [])

  const municipality = useMemo(
    () => (answers.municipality ? findMunicipality(municipalities, answers.municipality) : undefined),
    [municipalities, answers.municipality]
  )

  const income = validateMonthlyIncome(answers.monthlyIncome)
  const incomeOk = income.state === 'valid' || income.state === 'warning'
  const canCalculate = !!municipality && incomeOk
  const monthly = typeof answers.monthlyIncome === 'number' ? answers.monthlyIncome : null
  const annualIncome = monthly !== null && incomeOk ? monthly * answers.paymentPeriods : null
  const units = equivalenceScale(answers.adults, answers.children)
  const equivIncome =
    monthly !== null && incomeOk
      ? calculateEquivIncome(monthlyIncomeIn12(monthly, answers.paymentPeriods), answers.adults, answers.children)
      : null

  const calculate = useCallback(async () => {
    if (!canCalculate || typeof answers.monthlyIncome !== 'number') return null
    setStatus('calculating')
    setError(null)
    try {
      const [r] = await Promise.all([
        computeResults(
          {
            municipality: answers.municipality,
            monthlyIncome: answers.monthlyIncome,
            paymentPeriods: answers.paymentPeriods,
            adults: answers.adults,
            children: answers.children,
          },
          municipalities
        ),
        wait(minLoadingMs),
      ])
      if (logResponses) {
        logResponseToSheet({
          timestamp: new Date().toISOString(),
          municipality: answers.municipality,
          monthly_income: answers.monthlyIncome,
          adults: answers.adults,
          children: answers.children,
          perceived_percentile: answers.perceivedPercentile,
          actual_percentile: r.national_percentile,
          equiv_income: r.equiv_income,
        })
      }
      setResults(r)
      setStatus('done')
      return r
    } catch (e) {
      console.error('Calculation failed:', e)
      setError('No se pudieron calcular los resultados. Inténtalo de nuevo.')
      setStatus('error')
      return null
    }
  }, [canCalculate, answers, municipalities, minLoadingMs, logResponses])

  const reset = useCallback(() => {
    setResults(null)
    setError(null)
    setStatus('idle')
  }, [])

  return {
    answers,
    set,
    municipality,
    loadingMunicipalities: loading,
    income,
    canCalculate,
    annualIncome,
    units,
    equivIncome,
    status,
    results,
    error,
    calculate,
    reset,
  }
}
