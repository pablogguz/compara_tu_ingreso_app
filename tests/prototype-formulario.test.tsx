import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { MUNICIPALITIES, NATIONAL, PROVINCIAL, MUNICIPAL, MADRID_STATS, DENSITY } from './helpers/mockData'
import {
  gapUsted,
  headlineUsted,
  missingSummary,
  parseAmount,
  receiptNumber,
  unitsSum,
} from '@/prototypes/formulario/copy'

// The Formulario prototype end to end, with the Arrow files mocked:
// cover → the form (validation, focus on the first gap) → registry → justificante.
// 2.500 € × 12 for one adult = 30.000 € per consumption unit: percentile 30 in
// Spain, 60 in the province and 15 in the municipality (see mockData).

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
import FormularioApp from '@/prototypes/formulario/App'

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

describe('formulario copy', () => {
  it('speaks of the population, formally', () => {
    expect(headlineUsted(86, 'España')).toMatch(/^Su hogar ingresa más que el 86\s% de la población de España\.$/)
    expect(headlineUsted(1, 'España')).toMatch(/^Su hogar está entre el 1\s% con menos ingresos de España\.$/)
    // the raw lookup can say 100 above p99: the form caps at 99
    expect(headlineUsted(100, 'España')).toMatch(/más que el 99\s%/)
  })

  it('compares box 06 with box 10', () => {
    const under = gapUsted(86, 62)
    expect(under.signed).toBe('+24')
    expect(under.long).toMatch(/^En la casilla 06 declaró 62: se infravaloró en 24 puntos\./)
    expect(under.short).toBe('En la casilla 06 declaró 62: 24 puntos por debajo.')
    expect(gapUsted(30, 40).signed).toBe('−10')
    expect(gapUsted(30, 40).long).toMatch(/se sobrevaloró en 10 puntos/)
    expect(gapUsted(86, 85).long).toMatch(/casi lo clava\. La diferencia, 1 punto,/)
    expect(gapUsted(86, 86).signed).toBe('0')
    expect(gapUsted(86, 86).long).toMatch(/lo clava\. La casilla 13 queda a cero\./)
  })

  it('numbers the receipt and spells out the consumption units', () => {
    expect(receiptNumber('28079', 86)).toBe('28079-2024-0086')
    expect(receiptNumber('03122', 7)).toBe('03122-2024-0007')
    expect(unitsSum(1, 0)).toBe('1,0')
    expect(unitsSum(2, 1)).toBe('1 + 0,5 + 0,3 = 1,8')
    expect(unitsSum(5, 3)).toBe('1 + 4 × 0,5 + 3 × 0,3 = 3,9')
  })

  it('says what is missing in the form’s voice', () => {
    expect(missingSummary(['01', '06'], [], false)).toBe('Faltan las casillas 01 y 06 y la declaración.')
    expect(missingSummary(['01'], [], false)).toBe('Faltan la casilla 01 y la declaración.')
    expect(missingSummary(['02'], [], true)).toBe('Falta la casilla 02.')
    expect(missingSummary([], ['04'], false)).toBe('Falta marcar la declaración. Revise la casilla 04.')
    expect(missingSummary([], [], true)).toBe('Casillas completas. Puede presentar la declaración.')
  })

  it('reads amounts the Spanish way', () => {
    expect(parseAmount('3.200,50 €')).toBe(3200.5)
    expect(parseAmount('3.200')).toBe(3200)
    expect(parseAmount('3200')).toBe(3200)
    expect(parseAmount('3200.5')).toBe(3200.5)
    expect(parseAmount('')).toBe('')
  })
})

describe('Formulario prototype', () => {
  it('fills the form, presents it and issues the justificante', async () => {
    render(<FormularioApp />)
    expect(screen.getByRole('heading', { level: 1, name: 'Declaración de la posición de renta del hogar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cumplimentar/i }))

    // presenting an empty form sends the user to the first gap
    const combo = await screen.findByRole('combobox', { name: /01 Municipio de residencia/ })
    await waitFor(() => expect(combo).not.toHaveAttribute('placeholder', 'Cargando municipios…'))
    fireEvent.click(screen.getByRole('button', { name: /presentar declaración/i }))
    expect(screen.getByText('Faltan las casillas 01, 02 y 06 y la declaración.')).toBeInTheDocument()
    expect(screen.getByText('Casilla 01: escriba y elija su municipio en la lista.')).toBeInTheDocument()
    await waitFor(() => expect(combo).toHaveFocus())
    expect(combo).toHaveAttribute('aria-invalid', 'true')

    // 01 · the municipality, and its INE code filled in by the application
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'madrid' } })
    fireEvent.keyDown(combo, { key: 'Enter', code: 'Enter' })
    expect(combo).toHaveValue('Madrid (Madrid)')
    expect(screen.getByText('28079')).toBeInTheDocument()

    // 02 · 03 · income and pagas; box 07 adds them up
    const income = screen.getByLabelText(/02 Ingresos netos al mes/)
    fireEvent.change(income, { target: { value: '60000' } })
    expect(income).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Casilla 02: consigne un importe entre 1 y 50.000 € al mes.')).toBeInTheDocument()
    fireEvent.change(income, { target: { value: '2500' } })
    expect(screen.getByText('30.000,00 €')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /14 pagas/ }))
    expect(screen.getByText('35.000,00 €')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /12 pagas/ }))

    // 04 · 05 · the household; box 08 spells the scale out
    const adults = screen.getByLabelText(/04 Personas de 14 años o más/)
    fireEvent.change(adults, { target: { value: '0' } })
    expect(screen.getByText('Casilla 04: entre 1 y 20 personas, usted incluido.')).toBeInTheDocument()
    fireEvent.keyDown(adults, { key: 'ArrowUp' })
    expect(adults).toHaveValue('1')
    fireEvent.change(screen.getByLabelText(/05 Menores de 14 años/), { target: { value: '1' } })
    expect(screen.getByText('1 + 0,3 = 1,3')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/05 Menores de 14 años/), { target: { value: '0' } })

    // 06 · the guess: the box and the ruler are the same value
    const ruler = screen.getByRole('slider', { name: /casilla 06 en la regla/i })
    expect(ruler).toHaveAttribute('aria-valuetext', 'Sin marcar')
    fireEvent.change(screen.getByLabelText(/06 ¿Qué porcentaje de la población/), { target: { value: '40' } })
    expect(ruler).toHaveValue('40')
    expect(ruler).toHaveAttribute('aria-valuetext', '40 %')

    fireEvent.click(screen.getByRole('checkbox', { name: /Declaro que los datos consignados/ }))
    expect(screen.getByText('Casillas completas. Puede presentar la declaración.')).toBeInTheDocument()

    // the registry, then the justificante
    fireEvent.click(screen.getByRole('button', { name: /presentar declaración/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Registro de entrada' })).toBeInTheDocument()
    const title = await screen.findByRole(
      'heading',
      { level: 1, name: 'Justificante de posición de renta del hogar' },
      { timeout: 5000 }
    )
    await waitFor(() => expect(title).toHaveFocus())
    expect(screen.getAllByText('28079-2024-0030').length).toBeGreaterThan(0)
    expect(screen.getByText('Percentil 30')).toBeInTheDocument()
    const hero = screen.getByRole('region', { name: 'Resultado' })
    expect(within(hero).getByText(/^Su hogar ingresa más que el 30\s% de la población de España\.$/)).toBeInTheDocument()
    expect(within(hero).getByText(/se sobrevaloró en 10 puntos/)).toBeInTheDocument()
    // …and the same news, read out by the live region
    const live = document.querySelector('[aria-live="polite"]')
    await waitFor(() => expect(live).toHaveTextContent(/30\s% de la población de España\. En la casilla 06 declaró 40/))

    // the liquidation
    const liq = screen.getByRole('region', { name: 'Liquidación' })
    expect(within(liq).getByText('Percentil en la provincia de Madrid').closest('div')).toHaveTextContent(/60$/)
    expect(within(liq).getByText('Percentil en el municipio de Madrid').closest('div')).toHaveTextContent(/15$/)
    expect(within(liq).getByText('Diferencia (10 − 06)').closest('div')).toHaveTextContent(/−10$/)

    // Anexo I switches between the three distributions
    expect(screen.getByRole('img', { name: /en España, de 0 a 90\.000 €/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Provincia de Madrid/ }))
    expect(screen.getByRole('heading', { name: /Anexo I · Renta por unidad de consumo en la provincia de Madrid/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /menos renta que su hogar \(60\s%\)/ })).toBeInTheDocument()

    // Anexo II: the municipality, with the provincial average flagged
    const annex = screen.getByRole('region', { name: /Anexo II · Municipio de Madrid/ })
    expect(annex).toHaveTextContent(/21\.500\s€/)
    expect(annex).toHaveTextContent('Población nacida en el extranjero (2024, media provincial)')

    // back to the form: the answers are kept, and it is now a complementaria
    fireEvent.click(screen.getByRole('button', { name: 'Volver a declarar' }))
    expect(await screen.findByRole('combobox', { name: /01 Municipio de residencia/ })).toHaveValue('Madrid (Madrid)')
    expect(screen.getAllByText('Declaración complementaria').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/02 Ingresos netos al mes/)).toHaveValue('2.500,00')
    expect(screen.getByLabelText(/06 ¿Qué porcentaje de la población/)).toHaveValue('40')
  }, 15000)

  it('shows an administrative notice when the calculation fails, with a retry', async () => {
    vi.mocked(loadNationalPercentiles).mockRejectedValueOnce(new Error('network'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<FormularioApp />)
    fireEvent.click(screen.getByRole('button', { name: /cumplimentar/i }))
    const combo = await screen.findByRole('combobox', { name: /01 Municipio de residencia/ })
    await waitFor(() => expect(combo).not.toHaveAttribute('placeholder', 'Cargando municipios…'))
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'sevilla' } })
    fireEvent.keyDown(combo, { key: 'Enter', code: 'Enter' })
    fireEvent.change(screen.getByLabelText(/02 Ingresos netos al mes/), { target: { value: '1800' } })
    fireEvent.change(screen.getByLabelText(/06 ¿Qué porcentaje de la población/), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Declaro que los datos consignados/ }))
    fireEvent.click(screen.getByRole('button', { name: /presentar declaración/i }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No se ha podido tramitar su declaración' }, { timeout: 5000 })
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/Sus respuestas se conservan/)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Justificante de posición de renta del hogar' }, { timeout: 5000 })
    ).toBeInTheDocument()
  }, 15000)
})
