import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { layoutHorizontal, layoutVertical, fit } from '@/prototypes/linea/layout'
import { MUNICIPALITIES, NATIONAL, PROVINCIAL, MUNICIPAL, MADRID_STATS, DENSITY } from './helpers/mockData'

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

import * as loader from '@/lib/dataLoader'
import LineaApp from '@/prototypes/linea/App'

beforeEach(() => {
  vi.mocked(loader.loadMunicipalityLookup).mockResolvedValue(MUNICIPALITIES)
  vi.mocked(loader.loadNationalPercentiles).mockResolvedValue(NATIONAL)
  vi.mocked(loader.loadProvincialPercentiles).mockResolvedValue(PROVINCIAL)
  vi.mocked(loader.loadMunicipalPercentiles).mockResolvedValue(MUNICIPAL)
  vi.mocked(loader.loadNationalDensity).mockResolvedValue(DENSITY)
  vi.mocked(loader.loadProvincialDensity).mockResolvedValue(DENSITY)
  vi.mocked(loader.loadMunicipalDensity).mockResolvedValue(DENSITY)
  vi.mocked(loader.loadMunicipalityStats).mockResolvedValue(MADRID_STATS)
})

afterEach(cleanup)

// P10, P25, Mediana, P75, P90, P99 with typical label widths
const stations = [10, 25, 50, 75, 90, 99].map((p) => ({ p, name: 30, value: 66 }))

describe('línea · label layout', () => {
  it('fit() nudges a label clear of an obstacle, or gives up', () => {
    expect(fit(100, 40, [], { min: 0, max: 1000, maxShift: 10 })).toBe(0)
    const d = fit(100, 40, [{ lo: 90, hi: 110 }], { min: 0, max: 1000, maxShift: 40, gap: 6 })
    expect(Math.abs(d!)).toBe(36)
    expect(fit(100, 40, [{ lo: 90, hi: 110 }], { min: 0, max: 1000, maxShift: 10 })).toBeNull()
  })

  it('hides the station under the "you" dot and keeps the rest', () => {
    const out = layoutHorizontal({ width: 1300, user: 90, stations, flag: 110 })
    expect(out.stations.map((s) => s.show)).toEqual([true, true, true, true, false, true])
  })

  it('keeps the flag inside the line at both ends', () => {
    expect(layoutHorizontal({ width: 1000, user: 1, stations, flag: 110 }).flagShift).toBeGreaterThan(0)
    expect(layoutHorizontal({ width: 1000, user: 99, stations, flag: 110 }).flagShift).toBeLessThan(0)
  })

  it('rings the dot when the guess is right under it, and drops the label a row', () => {
    const exact = layoutHorizontal({ width: 1000, user: 86, guess: 86, stations, flag: 110, guessLabel: 170 })
    expect(exact.guess).toMatchObject({ ring: true, row: 'below' })
    const apart = layoutHorizontal({ width: 1300, user: 86, guess: 62, stations, flag: 110, guessLabel: 170 })
    expect(apart.guess).toMatchObject({ ring: false, row: 'values' })
  })

  it('drops a minor station when the line is too narrow for its labels', () => {
    const out = layoutHorizontal({ width: 600, user: 40, stations, flag: 110 })
    expect(out.stations.filter((s) => s.show).length).toBeLessThan(6)
    expect(out.stations[2].show).toBe(true) // the median survives
  })

  it('vertical: drops stations whose labels would collide with "you"', () => {
    const out = layoutVertical({ height: 600, user: 86, guess: 62, stationPs: [10, 25, 50, 75, 90, 99] })
    expect(out.stations[4].show).toBe(false) // P90 sits under the dot
    expect(out.stations[5].show).toBe(true)
    expect(out.y(99)).toBeLessThan(out.y(1))
  })
})

async function chooseMadrid() {
  const input = await screen.findByRole('combobox')
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: 'madrid' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(input).toHaveValue('Madrid (Madrid)')
}

describe('<LineaApp />', () => {
  it('keeps the ticket button inert until origin and income are in', async () => {
    render(<LineaApp />)
    const cta = screen.getByRole('button', { name: /sacar billete/i })
    expect(cta).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Faltan el origen y los ingresos')).toBeInTheDocument()
    fireEvent.click(cta)
    expect(screen.queryByText(/imprimiendo billete/i)).not.toBeInTheDocument()
    await chooseMadrid()
    expect(screen.getByText('Faltan los ingresos')).toBeInTheDocument()
  })

  it('the keypad writes into the display; steppers explain the OECD scale', async () => {
    render(<LineaApp />)
    const display = screen.getByRole('textbox', { name: /ingresos del hogar/i })
    fireEvent.click(screen.getByRole('button', { name: 'Doble cero' })) // ignored when empty
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Doble cero' }))
    expect(display).toHaveValue('2.500')
    expect(screen.getByText('30.000 € al año')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Borrar la última cifra' }))
    expect(display).toHaveValue('250')

    expect(screen.getByRole('button', { name: 'Quitar un adulto' })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir un adulto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Añadir un niño' }))
    expect(screen.getByText('= 1,8 unidades de consumo').parentElement).toHaveTextContent(
      '1 + 0,5 + 0,3 = 1,8 unidades de consumo'
    )
  })

  it('prints a ticket and shows the three stops', async () => {
    render(<LineaApp />)
    await chooseMadrid()
    for (const k of ['2', '5', 'Doble cero']) fireEvent.click(screen.getByRole('button', { name: k }))
    const guess = screen.getByRole('spinbutton')
    fireEvent.change(guess, { target: { value: '62' } })
    fireEvent.click(screen.getByRole('button', { name: /sacar billete/i }))
    expect(await screen.findByText(/imprimiendo billete/i)).toBeInTheDocument()

    // 30.000 € per consumption unit → national p30, provincial p60, municipal p15
    expect(await screen.findByRole('heading', { name: 'Usted está aquí' }, { timeout: 5000 })).toBeInTheDocument()
    const stub = screen.getByLabelText('Tus paradas')
    expect(within(stub).getByText('30')).toBeInTheDocument()
    expect(within(stub).getByText('60')).toBeInTheDocument()
    expect(within(stub).getByText('15')).toBeInTheDocument()
    expect(screen.getByText(/te infravaloraste|te sobrevaloraste|casi lo clavas/)).toHaveTextContent(
      'Creías estar en el 62: te sobrevaloraste en 32 puntos.'
    )
    // the imputed foreign-born share is flagged
    expect(screen.getByText(/Nacidos en el extranjero \(2024, media provincial\)/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo viaje' }))
    expect(await screen.findByRole('heading', { name: 'Saca tu billete' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /ingresos del hogar/i })).toHaveValue('2.500')
  }, 10000)
})
