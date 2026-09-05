import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ResultsView, { buildHeadline } from '@/components/ResultsView'
import type { UserInput, CalculatedResults } from '@/types'
import { MUNICIPALITIES } from './helpers/mockData'

vi.mock('@/lib/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/DataContext')>()
  return {
    ...actual,
    useMunicipalities: () => ({
      municipalities: MUNICIPALITIES,
      loading: false,
      error: null,
    }),
  }
})

// Highcharts does not render in jsdom — stub the chart and assert its props.
vi.mock('@/components/DistributionChart', () => ({
  default: ({ viewType }: { viewType: string }) => (
    <div data-testid="chart" data-view={viewType} />
  ),
}))

// vi.mock factories are hoisted above imports, so pull the fixture in lazily.
vi.mock('@/lib/dataLoader', async () => {
  const { MADRID_STATS } = await import('./helpers/mockData')
  return {
    loadMunicipalityStats: vi.fn().mockResolvedValue(MADRID_STATS),
    loadNationalDensity: vi.fn().mockResolvedValue([]),
  }
})

// Skip the rAF count-up so the number is deterministic.
vi.mock('@/hooks/useCountUp', () => ({
  useCountUp: (target: number) => target,
}))

// Skip the intro clock: every act is mounted from the first render. The
// sequencing itself is covered in useRevealSequence.test.tsx.
vi.mock('@/hooks/useRevealSequence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useRevealSequence')>()
  return { ...actual, useRevealSequence: () => 'done' as const }
})

afterEach(cleanup)

const userInput: UserInput = {
  municipality: '28079',
  monthlyIncome: 2500,
  adults: 1,
  children: 0,
  perceivedPercentile: 50,
}

const results: CalculatedResults = {
  equiv_income: 30000,
  national_percentile: 73,
  provincial_percentile: 61,
  municipal_percentile: 55,
  selected_prov: '28',
}

describe('buildHeadline', () => {
  it('uses the "más pobre" wording at the very bottom', () => {
    expect(buildHeadline(1, 'España')).toMatch(/entre el 1% más pobre de España/)
  })
  it('uses the "ingresó más que" wording otherwise', () => {
    expect(buildHeadline(73, 'Madrid')).toBe(
      'Tu hogar ingresó más que el 73% de la población en Madrid'
    )
  })
})

describe('<ResultsView />', () => {
  function setup() {
    const onRecalculate = vi.fn()
    render(
      <ResultsView userInput={userInput} results={results} onRecalculate={onRecalculate} />
    )
    return { onRecalculate }
  }

  it('shows the national percentile and headline by default', () => {
    setup()
    expect(screen.getByText('73')).toHaveClass('percentile-number')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /más que el 73% de la población en España/
    )
    expect(screen.getByText('30.000 €')).toBeInTheDocument()
    expect(screen.getByTestId('chart')).toHaveAttribute('data-view', 'national')
  })

  it('switches to the provincial and municipal views', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Provincial' }))
    expect(screen.getByText('61')).toHaveClass('percentile-number')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/en Madrid/)
    expect(screen.getByTestId('chart')).toHaveAttribute('data-view', 'provincial')
    expect(screen.getByRole('button', { name: 'Provincial' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Nacional' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Municipal' }))
    expect(screen.getByText('55')).toHaveClass('percentile-number')
    expect(screen.getByTestId('chart')).toHaveAttribute('data-view', 'municipal')
  })

  it('marks the hero as landed once the count matches the target', () => {
    setup()
    expect(screen.getByRole('region', { name: /más que el 73%/ })).toHaveClass('is-landed')
  })

  it('crossfades the headline when the view changes', () => {
    setup()
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveClass('result-text--swap')
    fireEvent.click(screen.getByRole('button', { name: 'Provincial' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('result-text--swap')
  })

  it('caps the displayed percentile at 99', () => {
    render(
      <ResultsView
        userInput={userInput}
        results={{ ...results, national_percentile: 100 }}
        onRecalculate={() => {}}
      />
    )
    expect(screen.getByText('99')).toHaveClass('percentile-number')
  })

  it('names the municipality in the stats section and loads its cards', async () => {
    setup()
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/Así es Madrid/)
    expect(await screen.findByText('21.500 €')).toBeInTheDocument()
  })

  it('"Volver a calcular" calls onRecalculate', () => {
    const { onRecalculate } = setup()
    fireEvent.click(screen.getByRole('button', { name: /volver a calcular/i }))
    expect(onRecalculate).toHaveBeenCalledTimes(1)
  })
})
