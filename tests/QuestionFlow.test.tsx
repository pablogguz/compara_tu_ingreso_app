import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import QuestionFlow from '@/components/QuestionFlow'
import { DataProvider } from '@/lib/DataContext'
import type { UserInput } from '@/types'
import { MUNICIPALITIES, NATIONAL, PROVINCIAL, MUNICIPAL } from './helpers/mockData'

vi.mock('@/lib/dataLoader', () => ({
  loadMunicipalityLookup: vi.fn(),
  loadNationalPercentiles: vi.fn(),
  loadProvincialPercentiles: vi.fn(),
  loadMunicipalPercentiles: vi.fn(),
}))

vi.mock('@/lib/sheetLogger', () => ({
  logResponseToSheet: vi.fn(),
}))

import {
  loadMunicipalityLookup,
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
} from '@/lib/dataLoader'
import { logResponseToSheet } from '@/lib/sheetLogger'

beforeEach(() => {
  vi.mocked(loadMunicipalityLookup).mockResolvedValue(MUNICIPALITIES)
  vi.mocked(loadNationalPercentiles).mockResolvedValue(NATIONAL)
  vi.mocked(loadProvincialPercentiles).mockResolvedValue(PROVINCIAL)
  vi.mocked(loadMunicipalPercentiles).mockResolvedValue(MUNICIPAL)
  vi.mocked(logResponseToSheet).mockClear()
})

afterEach(cleanup)

async function chooseMunicipality(name: string) {
  const input = await screen.findByRole('combobox', { name: /municipio de residencia/i })
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: name } })
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))

describe('<QuestionFlow /> end-to-end', () => {
  it('walks through the four steps and produces correct percentiles', async () => {
    const onCalculate = vi.fn<(input: UserInput) => void>()
    render(
      <DataProvider>
        <QuestionFlow onCalculate={onCalculate} />
      </DataProvider>
    )

    // Step 1 — municipality (wait for the lookup to resolve first)
    expect(screen.getByText('Municipio')).toBeInTheDocument()
    await chooseMunicipality('madrid')
    expect(await screen.findByText('Madrid (Madrid)')).toBeInTheDocument()
    next()

    // Step 2 — income
    expect(screen.getByText('Ingresos')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: /ingresos netos/i }), {
      target: { value: '2500' },
    })
    next()

    // Step 3 — household (defaults: 1 adult, 0 children)
    expect(screen.getByText('Hogar')).toBeInTheDocument()
    next()

    // Step 4 — perceived percentile
    expect(screen.getByText('Percepción')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: /^calcular$/i }))

    expect(onCalculate).toHaveBeenCalledTimes(1)
    const input = onCalculate.mock.calls[0][0]
    expect(input).toMatchObject({
      municipality: '28079',
      monthlyIncome: 2500,
      adults: 1,
      children: 0,
      perceivedPercentile: 65,
    })

    // equiv income = 2500 * 12 / 1 = 30 000
    const results = await input.calculationPromise!
    expect(results).toEqual({
      equiv_income: 30000,
      national_percentile: 30,
      provincial_percentile: 60,
      municipal_percentile: 15,
      selected_prov: '28',
    })
    expect(loadProvincialPercentiles).toHaveBeenCalledWith('28')
    expect(loadMunicipalPercentiles).toHaveBeenCalledWith('28079')
    expect(logResponseToSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        municipality: '28079',
        monthly_income: 2500,
        perceived_percentile: 65,
        actual_percentile: 30,
        equiv_income: 30000,
      })
    )
  })

  it('annualises 14 pagas before applying the equivalence scale', async () => {
    const onCalculate = vi.fn<(input: UserInput) => void>()
    render(
      <DataProvider>
        <QuestionFlow onCalculate={onCalculate} />
      </DataProvider>
    )
    await chooseMunicipality('barcelona')
    await screen.findByText('Barcelona (Barcelona)')
    next()

    fireEvent.change(screen.getByRole('spinbutton', { name: /ingresos netos/i }), {
      target: { value: '1200' },
    })
    fireEvent.click(screen.getByRole('switch')) // → 14 pagas
    next()
    next()
    fireEvent.click(screen.getByRole('button', { name: /^calcular$/i }))

    const results = await onCalculate.mock.calls[0][0].calculationPromise!
    // 1200 * 14 = 16 800 annual, single adult → equiv 16 800
    expect(results.equiv_income).toBeCloseTo(16800, 6)
    expect(results.national_percentile).toBe(16)
    expect(results.selected_prov).toBe('08')
    // The sheet receives the raw monthly figure the user typed
    expect(logResponseToSheet).toHaveBeenCalledWith(
      expect.objectContaining({ monthly_income: 1200 })
    )
  })

  it('lets the user go back and keeps previous answers', async () => {
    render(
      <DataProvider>
        <QuestionFlow onCalculate={() => {}} />
      </DataProvider>
    )
    await chooseMunicipality('sevilla')
    await screen.findByText('Sevilla (Sevilla)')
    next()
    fireEvent.change(screen.getByRole('spinbutton', { name: /ingresos netos/i }), {
      target: { value: '1800' },
    })
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }))
    expect(screen.getByText('Sevilla (Sevilla)')).toBeInTheDocument()
    next()
    expect(screen.getByRole('spinbutton', { name: /ingresos netos/i })).toHaveValue(1800)
  })
})
