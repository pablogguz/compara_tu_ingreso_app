import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MUNICIPALITIES, NATIONAL, PROVINCIAL, MUNICIPAL, MADRID_STATS, DENSITY } from './helpers/mockData'

// The Cien prototype end to end, with the Arrow files mocked:
// landing → four questions (validation, Enter, keyboard grid) → results.

vi.mock('@/lib/dataLoader', () => ({
  loadMunicipalityLookup: vi.fn(),
  loadNationalPercentiles: vi.fn(),
  loadProvincialPercentiles: vi.fn(),
  loadMunicipalPercentiles: vi.fn(),
  loadNationalDensity: vi.fn(),
  loadProvincialDensity: vi.fn(),
  loadMunicipalDensity: vi.fn(),
  loadMunicipalityStats: vi.fn(),
}))

import {
  loadMunicipalityLookup,
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
  loadNationalDensity,
  loadProvincialDensity,
  loadMunicipalDensity,
  loadMunicipalityStats,
} from '@/lib/dataLoader'
import CienApp from '@/prototypes/cien/App'

beforeEach(() => {
  vi.mocked(loadMunicipalityLookup).mockResolvedValue(MUNICIPALITIES)
  vi.mocked(loadNationalPercentiles).mockResolvedValue(NATIONAL)
  vi.mocked(loadProvincialPercentiles).mockResolvedValue(PROVINCIAL)
  vi.mocked(loadMunicipalPercentiles).mockResolvedValue(MUNICIPAL)
  vi.mocked(loadNationalDensity).mockResolvedValue(DENSITY)
  vi.mocked(loadProvincialDensity).mockResolvedValue(DENSITY)
  vi.mocked(loadMunicipalDensity).mockResolvedValue(DENSITY)
  vi.mocked(loadMunicipalityStats).mockResolvedValue(MADRID_STATS)
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

afterEach(cleanup)

const next = (name: RegExp = /siguiente/i) => fireEvent.click(screen.getByRole('button', { name }))

describe('Cien prototype', () => {
  it('walks the four questions and lands on the poster', async () => {
    render(<CienApp />)
    fireEvent.click(screen.getByRole('button', { name: /empezar/i }))

    // 01 · municipality: required, chosen from the list with Enter
    await screen.findByRole('heading', { name: /dónde vives/i })
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(/elige tu municipio/i)
    const combo = await screen.findByRole('combobox', { name: /dónde vives/i })
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'madrid' } })
    fireEvent.keyDown(combo, { key: 'Enter', code: 'Enter' })
    expect(combo).toHaveValue('Madrid (Madrid)')
    expect(screen.getByText(/te compararemos con/i)).toHaveTextContent(/provincia de Madrid/)
    next()

    // 02 · income: thousands dots, the year, validation
    const income = await screen.findByRole('textbox', { name: /cuánto entra en casa al mes/i })
    fireEvent.change(income, { target: { value: '60000' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/entre 1 y 50.000/)
    fireEvent.change(income, { target: { value: '2500' } })
    expect(income).toHaveValue('2.500')
    expect(screen.getByText(/= 30\.000\s€ al año/)).toBeInTheDocument()
    next()

    // 03 · household: steppers and the OECD scale spelled out
    await screen.findByRole('heading', { name: /cuántas personas viven en casa/i })
    fireEvent.click(screen.getByRole('button', { name: /añadir una persona de 14 años o más/i }))
    expect(screen.getByText(/1 \+ 0,5 = 1,5 unidades de consumo/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /quitar una persona de 14 años o más/i }))
    expect(screen.getByRole('spinbutton', { name: /14 años o más/i })).toHaveValue('1')
    next()

    // 04 · the guess: required; arrows move and pick, Enter goes on
    const group = await screen.findByRole('radiogroup', { name: /qué número crees que eres/i })
    next(/ver mi número/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/elige un cuadrado/i)
    expect(within(group).queryAllByRole('radio')).toHaveLength(99)
    fireEvent.keyDown(within(group).getByRole('radio', { name: '50' }), { key: 'ArrowUp' })
    expect(within(group).getByRole('radio', { name: '40' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(within(group).getByRole('radio', { name: '40' }), { key: 'Enter' })

    // loading, then the poster: 30 nationally (60 province, 15 municipality)
    expect(await screen.findByText(/colocándote entre cien/i)).toBeInTheDocument()
    const h1 = await screen.findByRole('heading', { level: 1, name: /tu hogar es el número\s*30/i }, { timeout: 4000 })
    expect(h1).toBeInTheDocument()
    expect(
      screen.getByText('De cada 100 personas en España, 30 viven en hogares con menos ingresos que el tuyo.')
    ).toBeInTheDocument()
    expect(screen.getByText(/creías estar en el 40: te sobrevaloraste en 10 puntos/i)).toBeInTheDocument()
    const levels = await screen.findByRole('region', { name: /el mismo hogar, en tres escalas/i })
    expect(levels).toHaveTextContent(/Número\s*30/)
    expect(levels).toHaveTextContent(/Número\s*60/)
    expect(levels).toHaveTextContent(/Número\s*15/)
    expect(levels).toHaveTextContent('Madrid (municipio)')
    const facts = screen.getByRole('region', { name: /así es madrid/i })
    expect(facts).toHaveTextContent(/21\.500\s€/)
    expect(facts).toHaveTextContent(/2024, media provincial/)
    // the grid has a text alternative
    expect(screen.getByRole('img', { name: /el tuyo es el 30/i })).toBeInTheDocument()

    // "Otra vez" keeps the answers
    fireEvent.click(screen.getByRole('button', { name: /otra vez/i }))
    expect(await screen.findByRole('combobox', { name: /dónde vives/i })).toHaveValue('Madrid (Madrid)')
  })
})
