import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import type { UserInput, CalculatedResults } from '@/types'
import { MUNICIPALITIES } from './helpers/mockData'

vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))

vi.mock('@/lib/analytics', () => ({
  initGA: vi.fn(),
  shouldLoadGA: () => false,
  getCookieConsent: () => 'rejected',
  setCookieConsent: vi.fn(),
}))

vi.mock('@/lib/dataLoader', () => ({
  loadMunicipalityLookup: vi.fn().mockResolvedValue([]),
}))

// The flow and results screens have their own tests; here we only exercise
// the stage machine, so both are replaced by minimal stand-ins.
let pendingPromise: Promise<CalculatedResults>

vi.mock('@/components/QuestionFlow', () => ({
  default: ({ onCalculate }: { onCalculate: (i: UserInput) => void }) => (
    <button
      type="button"
      onClick={() =>
        onCalculate({
          municipality: MUNICIPALITIES[2].mun_code,
          monthlyIncome: 2500,
          adults: 1,
          children: 0,
          perceivedPercentile: 50,
          calculationPromise: pendingPromise,
        })
      }
    >
      stub-calcular
    </button>
  ),
}))

vi.mock('@/components/ResultsView', () => ({
  default: ({
    results,
    onRecalculate,
  }: {
    results: CalculatedResults
    onRecalculate: () => void
  }) => (
    <div>
      <p>stub-resultados {results.national_percentile}</p>
      <button type="button" onClick={onRecalculate}>
        stub-volver
      </button>
    </div>
  ),
}))

import Home from '@/app/page'
import App, { MIN_LOADING_MS } from '@/components/App'

const RESULTS: CalculatedResults = {
  equiv_income: 30000,
  national_percentile: 42,
  provincial_percentile: 40,
  municipal_percentile: 38,
  selected_prov: '28',
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  window.alert = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('<Home /> stage machine', () => {
  it('starts on the landing page without the help button', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: /comenzar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ayuda/i })).toBeNull()
  })

  it('landing → questions → loading → results → questions', async () => {
    let resolve!: (r: CalculatedResults) => void
    pendingPromise = new Promise((r) => (resolve = r))

    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: /comenzar/i }))
    expect(screen.getByRole('button', { name: /stub-calcular/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ayuda/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /stub-calcular/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/calculando tus resultados/i)

    await act(async () => {
      resolve(RESULTS)
      await pendingPromise
    })
    // the loading beat holds for MIN_LOADING_MS even when the data is ready
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      await screen.findByText('stub-resultados 42', {}, { timeout: MIN_LOADING_MS + 1500 })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /stub-volver/i }))
    expect(screen.getByRole('button', { name: /stub-calcular/i })).toBeInTheDocument()
  })

  it('returns to the questions and alerts when the calculation fails', async () => {
    let reject!: (e: Error) => void
    pendingPromise = new Promise((_, r) => (reject = r))

    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: /comenzar/i }))
    fireEvent.click(screen.getByRole('button', { name: /stub-calcular/i }))
    expect(screen.getByRole('status')).toBeInTheDocument()

    await act(async () => {
      reject(new Error('arrow missing'))
      await pendingPromise.catch(() => {})
    })
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringMatching(/no se pudieron calcular/i)
    )
    expect(screen.getByRole('button', { name: /stub-calcular/i })).toBeInTheDocument()
  })

  it('boots straight into any stage (the /mocks screens)', () => {
    render(<App boot={{ stage: 'loading' }} mock />)
    expect(screen.getByRole('status')).toHaveTextContent(/calculando tus resultados/i)
    expect(screen.queryByRole('button', { name: /comenzar/i })).toBeNull()
  })

  it('boots into results with the given numbers', () => {
    render(
      <App
        boot={{
          stage: 'results',
          results: RESULTS,
          userInput: {
            municipality: MUNICIPALITIES[2].mun_code,
            monthlyIncome: 2500,
            adults: 1,
            children: 0,
            perceivedPercentile: 50,
          },
        }}
        mock
      />
    )
    expect(screen.getByText('stub-resultados 42')).toBeInTheDocument()
  })
})
