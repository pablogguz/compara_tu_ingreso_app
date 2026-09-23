'use client'

import { useState } from 'react'
import type { UserInput } from '@/types'
import { useMunicipalities } from '@/lib/DataContext'
import { computeResults } from '@/lib/computeResults'
import { logResponseToSheet } from '@/lib/sheetLogger'
import { runViewTransition } from '@/lib/viewTransition'
import {
  useQuestionFlow,
  TOTAL_STEPS,
  type QuestionFlowState,
} from '@/hooks/useQuestionFlow'
import ProgressHeader from './questions/ProgressHeader'
import MunicipalityStep from './questions/MunicipalityStep'
import IncomeStep from './questions/IncomeStep'
import HouseholdStep from './questions/HouseholdStep'
import PerceivedStep from './questions/PerceivedStep'

interface QuestionFlowProps {
  onCalculate: (input: UserInput) => void
  /** Seed answers / step (used by the /mocks screens). */
  initialState?: Partial<QuestionFlowState>
  /** Append the answers to the research sheet (off in /mocks). */
  logResponses?: boolean
}

export default function QuestionFlow({
  onCalculate,
  initialState,
  logResponses = true,
}: QuestionFlowProps) {
  const { state, update, next, prev } = useQuestionFlow(initialState)
  const { municipalities } = useMunicipalities()
  const [isCalculating, setIsCalculating] = useState(false)

  // Steps change inside a view transition: the old question racks out of
  // focus sideways while the new one slides in from the other side.
  const goNext = () => runViewTransition(next, 'step', 'forward')
  const goPrev = () => runViewTransition(prev, 'step', 'back')

  const handleCalculate = () => {
    if (state.monthlyIncome === '' || state.monthlyIncome <= 0) return
    if (!state.municipality) return

    setIsCalculating(true)
    const monthlyIncome = state.monthlyIncome

    const calculationPromise = computeResults(
      {
        municipality: state.municipality,
        monthlyIncome,
        paymentPeriods: state.paymentPeriods,
        adults: state.adults,
        children: state.children,
      },
      municipalities
    ).then((results) => {
      if (logResponses) {
        logResponseToSheet({
          timestamp: new Date().toISOString(),
          municipality: state.municipality,
          monthly_income: monthlyIncome,
          adults: state.adults,
          children: state.children,
          perceived_percentile: state.perceivedPercentile,
          actual_percentile: results.national_percentile,
          equiv_income: results.equiv_income,
        })
      }
      return results
    })

    onCalculate({
      municipality: state.municipality,
      monthlyIncome,
      adults: state.adults,
      children: state.children,
      perceivedPercentile: state.perceivedPercentile,
      calculationPromise,
    })
    setIsCalculating(false)
  }

  return (
    <div id="main-form">
      <ProgressHeader step={state.step} total={TOTAL_STEPS} />
      <div className="question-stage">
        {state.step === 1 && (
          <MunicipalityStep
            value={state.municipality}
            onChange={(v) => update('municipality', v)}
            onNext={goNext}
          />
        )}

        {state.step === 2 && (
          <IncomeStep
            value={state.monthlyIncome}
            paymentPeriods={state.paymentPeriods}
            onValueChange={(v) => update('monthlyIncome', v)}
            onPaymentPeriodsChange={(p) => update('paymentPeriods', p)}
            onNext={goNext}
            onPrev={goPrev}
          />
        )}

        {state.step === 3 && (
          <HouseholdStep
            adults={state.adults}
            children={state.children}
            onAdultsChange={(n) => update('adults', n)}
            onChildrenChange={(n) => update('children', n)}
            onNext={goNext}
            onPrev={goPrev}
          />
        )}

        {state.step === 4 && (
          <PerceivedStep
            value={state.perceivedPercentile}
            isCalculating={isCalculating}
            onChange={(n) => update('perceivedPercentile', n)}
            onCalculate={handleCalculate}
            onPrev={goPrev}
          />
        )}
      </div>
    </div>
  )
}
