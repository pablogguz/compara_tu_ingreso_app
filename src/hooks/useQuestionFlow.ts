'use client'

import { useState } from 'react'

export interface QuestionFlowState {
  step: number
  municipality: string
  monthlyIncome: number | ''
  paymentPeriods: 12 | 14
  adults: number
  children: number
  perceivedPercentile: number
}

export const TOTAL_STEPS = 4

const initial: QuestionFlowState = {
  step: 1,
  municipality: '',
  monthlyIncome: '',
  paymentPeriods: 12,
  adults: 1,
  children: 0,
  perceivedPercentile: 50,
}

export function useQuestionFlow() {
  const [state, setState] = useState<QuestionFlowState>(initial)

  const update = <K extends keyof QuestionFlowState>(
    key: K,
    value: QuestionFlowState[K]
  ) => setState((s) => ({ ...s, [key]: value }))

  const next = () =>
    setState((s) => ({ ...s, step: Math.min(TOTAL_STEPS, s.step + 1) }))

  const prev = () =>
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) }))

  return { state, update, next, prev }
}
