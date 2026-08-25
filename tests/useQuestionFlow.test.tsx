import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuestionFlow, TOTAL_STEPS } from '@/hooks/useQuestionFlow'

describe('useQuestionFlow', () => {
  it('starts at step 1 with sensible defaults', () => {
    const { result } = renderHook(() => useQuestionFlow())
    expect(result.current.state).toMatchObject({
      step: 1,
      municipality: '',
      monthlyIncome: '',
      paymentPeriods: 12,
      adults: 1,
      children: 0,
      perceivedPercentile: 50,
    })
  })

  it('advances and clamps at the last step', () => {
    const { result } = renderHook(() => useQuestionFlow())
    act(() => {
      for (let i = 0; i < TOTAL_STEPS + 3; i++) result.current.next()
    })
    expect(result.current.state.step).toBe(TOTAL_STEPS)
  })

  it('goes back and clamps at the first step', () => {
    const { result } = renderHook(() => useQuestionFlow())
    act(() => {
      result.current.next()
      result.current.next()
    })
    expect(result.current.state.step).toBe(3)
    act(() => {
      result.current.prev()
      result.current.prev()
      result.current.prev()
    })
    expect(result.current.state.step).toBe(1)
  })

  it('updates individual fields without touching the rest', () => {
    const { result } = renderHook(() => useQuestionFlow())
    act(() => {
      result.current.update('municipality', '28079')
      result.current.update('monthlyIncome', 2500)
      result.current.update('paymentPeriods', 14)
    })
    expect(result.current.state.municipality).toBe('28079')
    expect(result.current.state.monthlyIncome).toBe(2500)
    expect(result.current.state.paymentPeriods).toBe(14)
    expect(result.current.state.step).toBe(1)
    expect(result.current.state.adults).toBe(1)
  })
})
