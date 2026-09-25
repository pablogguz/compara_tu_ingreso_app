import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MUNICIPALITIES, NATIONAL, PROVINCIAL, MUNICIPAL, MADRID_STATS, DENSITY } from './helpers/mockData'

// The site end to end, with the Arrow files mocked: the four questions
// (validation, Enter, keyboard grid), the research log, the story (jsdom has no
// IntersectionObserver, so the figure shows its final state), the summary,
// "Volver a empezar" and the help dialog. Pure pieces of the figure's geometry
// are checked too.

vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))

const consent = vi.hoisted(() => ({ value: null as 'accepted' | 'rejected' | null }))
vi.mock('@/lib/analytics', () => ({
  initGA: vi.fn(),
  shouldLoadGA: () => false,
  getCookieConsent: () => consent.value,
  setCookieConsent: vi.fn(),
}))

vi.mock('@/lib/sheetLogger', () => ({ logResponseToSheet: vi.fn() }))

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
import { logResponseToSheet } from '@/lib/sheetLogger'
import EnsayoApp from '@/components/ensayo/App'
import { binCounts, curveInSquares, peopleBelow, placeLabels, squareIncomes } from '@/components/ensayo/geometry'
import { binText, sentenceFor } from '@/components/ensayo/copy'

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
  consent.value = 'rejected'
  vi.mocked(logResponseToSheet).mockClear()
})

afterEach(cleanup)

const next = (name: RegExp = /siguiente/i) => fireEvent.click(screen.getByRole('button', { name }))

describe('Ensayo: the figure geometry', () => {
  it('counts the people below you: that many dark squares, yours is the next', () => {
    // NATIONAL: percentile p is p × 1.000 €
    expect(peopleBelow(30500, NATIONAL)).toBe(30) // 30 below, yours is square 31
    expect(peopleBelow(30000, NATIONAL)).toBe(30)
    expect(peopleBelow(500, NATIONAL)).toBe(0) // under the 1st percentile: square 1
    expect(peopleBelow(250000, NATIONAL)).toBe(99) // above the 99th: square 100
  })

  it('stacks a hundred squares into 5.000 € bins, one per percentile', () => {
    const incomes = squareIncomes(NATIONAL, 31, 30500)
    expect(incomes).toHaveLength(100)
    expect(incomes[30]).toBe(30500) // your square (31) carries your income
    expect(incomes[29]).toBe(30000) // square 30 stands at the 30th percentile
    expect(incomes[99]).toBeGreaterThanOrEqual(90000) // the 100th sits in the last bin
    const counts = binCounts(incomes)
    expect(counts).toHaveLength(18)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(100)
    expect(counts[17]).toBeGreaterThan(0)
  })

  it('scales a density so its area matches the hundred squares', () => {
    const squares = curveInSquares(DENSITY)
    // ∫ (squares / 100 / 5.000) dx over 0…90.000 € ≈ 1, less the tail beyond
    const step = 90000 / (squares.length - 1)
    const area = squares.reduce((a, v) => a + v, 0) * step / 100 / 5000
    expect(area).toBeGreaterThan(0.95)
    expect(area).toBeLessThanOrEqual(1.01)
  })

  it('keeps labels over the plot apart', () => {
    const placed = placeLabels(
      [
        { id: 'a', x: 100, width: 90 },
        { id: 'b', x: 120, width: 90 },
      ],
      0,
      600
    )
    expect(placed[0].row).not.toBe(placed[1].row)
  })

  it('speaks of people, and of the last bin as open-ended', () => {
    expect(sentenceFor(86, 'España')).toBe(
      'De cada 100 personas en España, 86 tienen menos ingresos que tú.'
    )
    expect(binText(38400)).toMatch(/^de 35\.000 a 40\.000\s€$/)
    expect(binText(196000)).toMatch(/^de 85\.000\s€ o más$/)
  })
})

describe('Ensayo', () => {
  it('walks the questions, tells the story and keeps the answers', async () => {
    render(<EnsayoApp />)
    expect(screen.getByRole('heading', { level: 1, name: 'Descubre tu posición en la distribución de la renta' })).toBeInTheDocument()
    // the essay speaks of people, and keeps what it compares with to itself
    expect(screen.getByText(/de la que tiene menos ingresos a la que más/i)).toBeInTheDocument()

    // the questions wait for "Comenzar", then have the screen to themselves
    expect(screen.queryByRole('combobox', { name: /en qué municipio vives/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /comenzar/i }))

    // 1 · municipality: required, chosen from the list with Enter
    await screen.findByRole('heading', { name: /en qué municipio vives/i })
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(/elige tu municipio/i)
    const combo = await screen.findByRole('combobox', { name: /en qué municipio vives/i })
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'madrid' } })
    fireEvent.keyDown(combo, { key: 'Enter', code: 'Enter' })
    expect(combo).toHaveValue('Madrid (Madrid)')
    expect(screen.queryByText(/te compararemos/i)).not.toBeInTheDocument()
    next()

    // 2 · income: thousands dots, the year, validation
    const income = await screen.findByRole('textbox', { name: /cuánto dinero entraba en tu hogar cada mes en 2025/i })
    fireEvent.change(income, { target: { value: '60000' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/entre 1 y 50.000/)
    fireEvent.change(income, { target: { value: '2500' } })
    expect(income).toHaveValue('2.500')
    expect(screen.getByText(/30\.000\s€ al año/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '14 pagas' }))
    expect(screen.getByText(/35\.000\s€ al año/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '12 pagas' }))
    next()

    // 3 · household: steppers and the OECD scale spelled out
    await screen.findByRole('heading', { name: /cuántas personas viven en tu hogar/i })
    fireEvent.click(screen.getByRole('button', { name: /añadir una persona de 14 años o más/i }))
    expect(screen.getByRole('spinbutton', { name: /14 años o más/i })).toHaveValue('2')
    fireEvent.click(screen.getByRole('button', { name: /quitar una persona de 14 años o más/i }))
    expect(screen.getByRole('spinbutton', { name: /14 años o más/i })).toHaveValue('1')
    // the equivalence scale is explained in the help dialog, not here
    expect(screen.queryByText(/unidades? de consumo/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /por qué lo preguntamos/i }))
    expect(screen.getByRole('tab', { name: 'Hogar' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    next()

    // 4 · the guess: required; square k means k − 1 people below; arrows move and pick; the slider follows
    const group = await screen.findByRole('radiogroup', { name: /cuál crees que serías tú/i })
    next(/ver dónde estoy/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/elige un cuadrado/i)
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(99) // square 1 cannot be chosen
    expect(radios[0]).toHaveAccessibleName('1 persona por debajo')
    expect(radios[98]).toHaveAccessibleName('99 personas por debajo')
    fireEvent.keyDown(within(group).getByRole('radio', { name: '50 personas por debajo' }), { key: 'ArrowUp' })
    const forty = within(group).getByRole('radio', { name: '40 personas por debajo' })
    expect(forty).toHaveAttribute('aria-checked', 'true')
    expect(forty).toHaveTextContent('¿Tú?')
    expect(screen.getByRole('slider', { name: /desliza/i })).toHaveValue('40')
    expect(screen.getByText(/crees que 40 de cada 100 personas tienen menos ingresos que tú/i)).toBeInTheDocument()
    // the slider moves the choice too, and back
    fireEvent.change(screen.getByRole('slider', { name: /desliza/i }), { target: { value: '12' } })
    expect(within(group).getByRole('radio', { name: '12 personas por debajo' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.change(screen.getByRole('slider', { name: /desliza/i }), { target: { value: '40' } })
    fireEvent.keyDown(forty, { key: 'Enter' })

    // loading, then the story: 30 nationally, 60 in the province, 15 in the municipality
    expect(await screen.findByText(/calculando/i)).toBeInTheDocument()
    const story = await screen.findByRole('region', { name: /dónde estás, paso a paso/i }, { timeout: 4000 })

    // the answers go to the research log (which itself checks cookie consent),
    // with the same fields as before
    expect(logResponseToSheet).toHaveBeenCalledTimes(1)
    expect(logResponseToSheet).toHaveBeenCalledWith({
      timestamp: expect.any(String),
      municipality: '28079',
      monthly_income: 2500,
      adults: 1,
      children: 0,
      perceived_percentile: 40,
      actual_percentile: 30,
      equiv_income: 30000,
    })
    expect(within(story).getByRole('link', { name: /saltar al resumen/i })).toHaveAttribute('href', '#resumen')
    expect(within(story).getByRole('heading', { name: /en realidad, tienes a 30 personas por debajo/i })).toBeInTheDocument()
    expect(within(story).getByRole('heading', { name: /creías tener a 40 personas por debajo/i })).toBeInTheDocument()
    expect(within(story).getByText(/donde creías estar, con 40 personas por debajo, la renta es de unos 40\.000\s€/i)).toBeInTheDocument()
    expect(within(story).getByText(/en españa quedaban 30 de cada 100 por debajo de ti\. en la provincia de madrid, 60\. aquí, 15/i)).toBeInTheDocument()
    expect(within(story).queryByText(/tu cuadrado (es|era) el/i)).not.toBeInTheDocument()
    // the squares agree with the words: 30 below, yours, 69 above
    expect(story.querySelectorAll('[class*="sqBelow"]')).toHaveLength(30)
    expect(story.querySelectorAll('[class*="sqYou"]')).toHaveLength(1)
    expect(story.querySelectorAll('[class*="sqAbove"]')).toHaveLength(69)
    expect(within(story).getByText(/creías que tu hogar ingresaba más que el 40 %: te sobrevaloraste en 10 puntos/i)).toBeInTheDocument()
    expect(within(story).getByText(/de cada 100 personas en la provincia de madrid, 60 tienen menos ingresos que tú/i)).toBeInTheDocument()
    expect(within(story).getByText(/de cada 100 personas en el municipio de madrid, 15 tienen/i)).toBeInTheDocument()
    // the charts name the two lines, and the median by its place
    expect(within(story).getByText(/tu predicción: 40\.000\s€/i)).toBeInTheDocument()
    expect(within(story).getByText(/tu hogar: 30\.000\s€/i)).toBeInTheDocument()
    expect(within(story).getByText(/mediana de madrid:/i)).toBeInTheDocument()
    // no semicolons in the story
    expect(story.textContent).not.toMatch(/;/)
    // without IntersectionObserver the figure rests on its last state, and says so
    expect(within(story).getByText(/la curva pasa a ser la del municipio de madrid\. allí quedan 15 de cada 100 por debajo de ti/i)).toBeInTheDocument()

    // the summary: three levels and the municipality
    const summary = screen.getByRole('region', { name: /tu resumen/i })
    expect(summary).toHaveTextContent(/Tu hogar ingresa más que el 30 % de la población de España/)
    expect(within(summary).getByRole('img', { name: /provincia de madrid: .*60\s%.*tu predicción, 40\.000\s€/i })).toBeInTheDocument()
    expect(within(summary).getAllByText('Tu predicción')).toHaveLength(3)
    expect(within(summary).getByRole('img', { name: /municipio de madrid: .*15\s% de la población del municipio de madrid/i })).toBeInTheDocument()
    const facts = within(summary).getByRole('region', { name: /así es madrid/i })
    expect(facts).toHaveTextContent(/21\.500\s€/)
    expect(facts).toHaveTextContent(/renta media por unidad de consumo \(2025\)/i)
    expect(facts).toHaveTextContent(/estudios superiores \(2023\)/i)
    expect(facts).toHaveTextContent(/nacidas en el extranjero \(2024, media provincial\)/i)

    // the record of the answers, and "Volver a empezar" keeps them
    expect(screen.getByText('40 de cada 100 por debajo de ti')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /volver a empezar/i }))
    expect(await screen.findByRole('combobox', { name: /en qué municipio vives/i })).toHaveValue('Madrid (Madrid)')
    expect(screen.queryByRole('region', { name: /tu resumen/i })).not.toBeInTheDocument()
  })

  it('says so when the calculation fails, and retries', async () => {
    vi.mocked(loadNationalPercentiles).mockRejectedValueOnce(new Error('offline'))
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<EnsayoApp />)
    fireEvent.click(screen.getByRole('button', { name: /comenzar/i }))
    const combo = await screen.findByRole('combobox', { name: /en qué municipio vives/i })
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'madrid' } })
    fireEvent.keyDown(combo, { key: 'Enter', code: 'Enter' })
    next()
    fireEvent.change(await screen.findByRole('textbox', { name: /cuánto dinero/i }), { target: { value: '2500' } })
    next()
    next()
    fireEvent.click(await screen.findByRole('radio', { name: '86 personas por debajo' }))
    next(/ver dónde estoy/i)
    const alert = await screen.findByText(/no hemos podido hacer las cuentas/i, {}, { timeout: 4000 })
    expect(alert.closest('[role="alert"]')).toHaveTextContent(/inténtalo de nuevo/i)
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    const story = await screen.findByRole('region', { name: /dónde estás, paso a paso/i }, { timeout: 4000 })
    // the answers survived the failure
    expect(within(story).getByText(/creías que tu hogar ingresaba más que el 86 %/i)).toBeInTheDocument()
    quiet.mockRestore()
  })

  it('opens the help dialog from the header and from the closing line', () => {
    render(<EnsayoApp />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ayuda y metodología' }))
    const dialog = screen.getByRole('dialog', { name: /instrucciones y dudas frecuentes/i })
    expect(within(dialog).getByRole('tab', { name: 'Datos' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /metodología y preguntas frecuentes/i }))
    expect(screen.getByRole('tab', { name: 'Metodología' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    // no floating button any more
    expect(screen.queryByRole('button', { name: 'Ayuda' })).not.toBeInTheDocument()
  })

  it('asks for cookie consent until the visitor answers', () => {
    consent.value = null
    render(<EnsayoApp />)
    expect(screen.getByRole('dialog', { name: /consentimiento de cookies/i })).toBeInTheDocument()
    cleanup()
    consent.value = 'accepted'
    render(<EnsayoApp />)
    expect(screen.queryByRole('dialog', { name: /consentimiento de cookies/i })).not.toBeInTheDocument()
  })

  it('has no bibliography and no "how to cite" section', () => {
    render(<EnsayoApp />)
    expect(screen.queryByText(/cómo citar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/referencias/i)).not.toBeInTheDocument()
  })
})
