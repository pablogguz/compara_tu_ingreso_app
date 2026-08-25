'use client'

import { useState } from 'react'
import type { UserInput, CalculatedResults } from '@/types'
import { calculateEquivIncome, findPercentile } from '@/lib/calculations'
import {
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
} from '@/lib/dataLoader'
import { useMunicipalities, findMunicipality } from '@/lib/DataContext'
import { logResponseToSheet } from '@/lib/sheetLogger'
import { useQuestionFlow, TOTAL_STEPS } from '@/hooks/useQuestionFlow'
import ProgressHeader from './questions/ProgressHeader'
import MunicipalityStep from './questions/MunicipalityStep'
import IncomeStep from './questions/IncomeStep'
import HouseholdStep from './questions/HouseholdStep'
import PerceivedStep from './questions/PerceivedStep'

interface QuestionFlowProps {
  onCalculate: (input: UserInput) => void
}

export default function QuestionFlow({ onCalculate }: QuestionFlowProps) {
  const { state, update, next, prev } = useQuestionFlow()
  const { municipalities } = useMunicipalities()
  const [isCalculating, setIsCalculating] = useState(false)

  const handleCalculate = () => {
    if (state.monthlyIncome === '' || state.monthlyIncome <= 0) return
    if (!state.municipality) return

    setIsCalculating(true)

    // 14-pagas: the entered "monthly" figure is one of 14 payments. Annualise
    // by multiplying *14, then divide by 12 to keep the equivalence-scale math
    // in a 12-month frame.
    const adjustedMonthlyIncome =
      state.paymentPeriods === 14
        ? (state.monthlyIncome * 14) / 12
        : state.monthlyIncome

    const calculationPromise = (async (): Promise<CalculatedResults> => {
      const selected = findMunicipality(municipalities, state.municipality)
      if (!selected) throw new Error(`Municipality not found: ${state.municipality}`)

      const equivIncome = calculateEquivIncome(
        adjustedMonthlyIncome,
        state.adults,
        state.children
      )

      const [nationalPerc, provincialPerc, municipalPerc] = await Promise.all([
        loadNationalPercentiles(),
        loadProvincialPercentiles(selected.prov_code),
        loadMunicipalPercentiles(state.municipality),
      ])

      const results: CalculatedResults = {
        equiv_income: equivIncome,
        national_percentile: findPercentile(equivIncome, nationalPerc),
        provincial_percentile: findPercentile(equivIncome, provincialPerc),
        municipal_percentile: findPercentile(equivIncome, municipalPerc),
        selected_prov: selected.prov_code,
      }

      logResponseToSheet({
        timestamp: new Date().toISOString(),
        municipality: state.municipality,
        monthly_income: state.monthlyIncome as number,
        adults: state.adults,
        children: state.children,
        perceived_percentile: state.perceivedPercentile,
        actual_percentile: results.national_percentile,
        equiv_income: equivIncome,
      })

      return results
    })()

    onCalculate({
      municipality: state.municipality,
      monthlyIncome: state.monthlyIncome as number,
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
            onNext={next}
          />
        )}

        {state.step === 2 && (
          <IncomeStep
            value={state.monthlyIncome}
            paymentPeriods={state.paymentPeriods}
            onValueChange={(v) => update('monthlyIncome', v)}
            onPaymentPeriodsChange={(p) => update('paymentPeriods', p)}
            onNext={next}
            onPrev={prev}
          />
        )}

        {state.step === 3 && (
          <HouseholdStep
            adults={state.adults}
            children={state.children}
            onAdultsChange={(n) => update('adults', n)}
            onChildrenChange={(n) => update('children', n)}
            onNext={next}
            onPrev={prev}
          />
        )}

        {state.step === 4 && (
          <PerceivedStep
            value={state.perceivedPercentile}
            isCalculating={isCalculating}
            onChange={(n) => update('perceivedPercentile', n)}
            onCalculate={handleCalculate}
            onPrev={prev}
          />
        )}
      </div>
    </div>
  )
}
