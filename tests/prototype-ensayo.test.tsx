import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MUNICIPALITIES, NATIONAL, PROVINCIAL, MUNICIPAL, MADRID_STATS, DENSITY } from './helpers/mockData'

// The Ensayo prototype end to end, with the Arrow files mocked: the four
// questions (validation, Enter, keyboard grid), the story (jsdom has no
// IntersectionObserver, so the figure shows its final state), the summary and
// "Volver a empezar". Pure pieces of the figure's geometry are checked too.

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
import EnsayoApp from '@/prototypes/ensayo/App'
import { binCounts, curveInSquares, peopleBelow, placeLabels, squareIncomes } from '@/prototypes/ensayo/geometry'
import { binText, sentenceFor } from '@/prototypes/ensayo/copy'

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
      'De cada 100 personas en España, 86 viven en hogares con menos ingresos que el tuyo.'
    )
    expect(binText(38400)).toMatch(/^de 35\.000 a 40\.000\s€$/)
    expect(binText(196000)).toMatch(/^de 85\.000\s€ o más$/)
  })
})

describe('Ensayo prototype', () => {
  it('walks the questions, tells the story and keeps the answers', async () => {
    render(<EnsayoApp />)
    expect(screen.getByRole('heading', { level: 1, name: /dónde estás tú en la distribución de la renta/i })).toBeInTheDocument()

    // 1 · municipality: required, chosen from the list with Enter
    await screen.findByRole('heading', { name: /en qué municipio vives/i })
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(/elige tu municipio/i)
    const combo = await screen.findByRole('combobox', { name: /en qué municipio vives/i })
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'madrid' } })
    fireEvent.keyDown(combo, { key: 'Enter', code: 'Enter' })
    expect(combo).toHaveValue('Madrid (Madrid)')
    expect(screen.getByText(/te compararemos con españa/i)).toHaveTextContent(/provincia de Madrid/)
    next()

    // 2 · income: thousands dots, the year, validation
    const income = await screen.findByRole('textbox', { name: /cuánto dinero entra en tu hogar/i })
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
    expect(screen.getByText(/1 \+ 0,5 = 1,5 unidades de consumo/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /quitar una persona de 14 años o más/i }))
    expect(screen.getByRole('spinbutton', { name: /14 años o más/i })).toHaveValue('1')
    // a sidenote opens inline on narrow screens
    const note = screen.getByRole('button', { name: /nota 5: ¿qué es una unidad de consumo\?/i })
    fireEvent.click(note)
    expect(note).toHaveAttribute('aria-expanded', 'true')
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
    expect(screen.getByText(/crees que 40 de cada 100 personas viven en hogares con menos ingresos/i)).toBeInTheDocument()
    // the slider moves the choice too, and back
    fireEvent.change(screen.getByRole('slider', { name: /desliza/i }), { target: { value: '12' } })
    expect(within(group).getByRole('radio', { name: '12 personas por debajo' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.change(screen.getByRole('slider', { name: /desliza/i }), { target: { value: '40' } })
    fireEvent.keyDown(forty, { key: 'Enter' })

    // loading, then the story: 30 nationally, 60 in the province, 15 in the municipality
    expect(await screen.findByText(/poniendo en fila/i)).toBeInTheDocument()
    const story = await screen.findByRole('region', { name: /dónde estás, paso a paso/i }, { timeout: 4000 })
    expect(within(story).getByRole('link', { name: /saltar al resumen/i })).toHaveAttribute('href', '#resumen')
    expect(within(story).getByRole('heading', { name: /en realidad, tienes a 30 personas por debajo/i })).toBeInTheDocument()
    expect(within(story).getByRole('heading', { name: /creías tener a 40 personas por debajo/i })).toBeInTheDocument()
    expect(within(story).getByText(/donde creías estar, con 40 personas por debajo, se vive con unos 40\.000\s€/i)).toBeInTheDocument()
    expect(within(story).getByText(/en españa quedaban 30 de cada 100 por debajo de ti; en la provincia de madrid, 60; aquí, 15/i)).toBeInTheDocument()
    expect(within(story).queryByText(/tu cuadrado (es|era) el/i)).not.toBeInTheDocument()
    // the squares agree with the words: 30 below, yours, 69 above
    expect(story.querySelectorAll('[class*="sqBelow"]')).toHaveLength(30)
    expect(story.querySelectorAll('[class*="sqYou"]')).toHaveLength(1)
    expect(story.querySelectorAll('[class*="sqAbove"]')).toHaveLength(69)
    expect(within(story).getByText(/creías estar en el 40: te sobrevaloraste en 10 puntos/i)).toBeInTheDocument()
    expect(within(story).getByText(/de cada 100 personas en la provincia de madrid, 60 viven/i)).toBeInTheDocument()
    expect(within(story).getByText(/de cada 100 personas en el municipio de madrid, 15 viven/i)).toBeInTheDocument()
    // without IntersectionObserver the figure rests on its last state, and says so
    expect(within(story).getByText(/la curva pasa a ser la del municipio de madrid\. allí quedan 15 de cada 100 por debajo de ti/i)).toBeInTheDocument()

    // the summary: three levels and the municipality
    const summary = screen.getByRole('region', { name: /tu resumen/i })
    expect(summary).toHaveTextContent(/Tu hogar ingresa más que el 30 % de la población de España/)
    expect(within(summary).getByRole('img', { name: /provincia de madrid: .*60\s%/i })).toBeInTheDocument()
    expect(within(summary).getByRole('img', { name: /municipio de madrid: .*15\s% de la población del municipio de madrid/i })).toBeInTheDocument()
    const facts = within(summary).getByRole('region', { name: /así es madrid/i })
    expect(facts).toHaveTextContent(/21\.500\s€/)
    expect(facts).toHaveTextContent(/renta media por unidad de consumo \(2024\)/i)
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
    expect(within(story).getByText(/creías estar en el 86/i)).toBeInTheDocument()
    quiet.mockRestore()
  })

  it('shows the method, the references and how to cite from the start', () => {
    render(<EnsayoApp />)
    const method = screen.getByRole('region', { name: /cómo se calcula/i })
    expect(method).toHaveTextContent(/37\.072 secciones censales/)
    expect(method).toHaveTextContent(/5,5 %/)
    expect(method).toHaveTextContent(/5,1 %/)
    expect(screen.getByRole('link', { name: /pdf, en inglés/i })).toHaveAttribute(
      'href',
      'https://github.com/pablogguz/compara_tu_ingreso_validation/blob/main/tex/note.pdf'
    )
    expect(screen.getByText('García Guzmán, P. (2026). Compara tu ingreso. comparatuingreso.es')).toBeInTheDocument()
  })
})
