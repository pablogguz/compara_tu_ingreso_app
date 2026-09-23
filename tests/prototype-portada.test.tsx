import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { countSentence, digitsOf, listJoin, plainMessage, splitAtPercent } from '@/prototypes/portada/copy'
import { headline } from '@/prototypes/shared/format'

// Percentiles 1…99 run from 5.000 € to 54.000 € in steps of 500 €, so
// 38.400 € per consumption unit sits at percentile 67 on every level.
const data = vi.hoisted(() => {
  const percentiles = Array.from({ length: 99 }, (_, i) => 5000 + i * 500)
  const density = Array.from({ length: 201 }, (_, i) => {
    const x = i * 800
    return { x, y: Math.exp(-((x - 18000) ** 2) / 2e8) }
  })
  return { percentiles, density }
})

vi.mock('@/lib/dataLoader', () => ({
  loadMunicipalityLookup: async () => [
    { mun_code: '28079', mun_name: 'Madrid', prov_code: '28', prov_name: 'Madrid' },
    { mun_code: '28127', mun_name: 'Rozas de Madrid, Las', prov_code: '28', prov_name: 'Madrid' },
  ],
  loadNationalPercentiles: async () => data.percentiles,
  loadProvincialPercentiles: async () => data.percentiles,
  loadMunicipalPercentiles: async () => data.percentiles,
  loadNationalDensity: async () => data.density,
  loadProvincialDensity: async () => data.density,
  loadMunicipalDensity: async () => data.density,
  loadMunicipalityStats: async () => ({
    net_income_equiv: 30610.7,
    net_income_equiv_is_imputed: 0,
    pct_higher_ed_completed: 46.3,
    pct_higher_ed_completed_is_imputed: 1,
    pct_foreign_born: 28,
    pct_foreign_born_is_imputed: 0,
  }),
}))

import PortadaApp from '@/prototypes/portada/App'

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

afterEach(cleanup)

describe('portada copy', () => {
  it('splits the headline around its figure, whatever the space before %', () => {
    const parts = splitAtPercent(headline(86, 'España'))
    expect(parts.before).toBe('Tu hogar ingresa más que el ')
    expect(parts.figure).toBe('86 %')
    expect(parts.after).toBe(' de la población de España')
    expect(splitAtPercent(headline(1, 'España')).figure).toBe('1 %')
  })

  it('talks about people', () => {
    expect(countSentence(86, 'España')).toBe(
      '86 de cada 100 personas en España viven en hogares con menos ingresos que el tuyo'
    )
    expect(countSentence(1, 'España')).toMatch(/^menos de 1 de cada 100 personas/)
  })

  it('joins lists and reads amounts the Spanish way', () => {
    expect(listJoin(['tu municipio'])).toBe('tu municipio')
    expect(listJoin(['a', 'b', 'c'])).toBe('a, b y c')
    expect(digitsOf('3.200,50 €')).toBe('3200')
    expect(plainMessage('⚠️ Recuerda que este valor debe ser mensual, no anual')).toBe(
      'Recuerda que este valor debe ser mensual, no anual'
    )
  })
})

describe('portada: the sentence, the article and back', () => {
  it('fills the sentence, reads the result and keeps the answers', async () => {
    render(<PortadaApp />)
    const cta = screen.getByRole('button', { name: /Leer mi resultado/ })
    expect(cta).toBeDisabled()
    expect(screen.getByText(/Faltan tu municipio, tus ingresos y tu estimación/)).toBeInTheDocument()

    const combo = await screen.findByRole('combobox', { name: 'Municipio de residencia' })
    await waitFor(() => expect(combo).not.toHaveAttribute('placeholder', 'Cargando municipios…'))
    fireEvent.focus(combo)
    fireEvent.change(combo, { target: { value: 'madr' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Madrid, Madrid' }))

    fireEvent.change(screen.getByLabelText('Ingresos netos mensuales del hogar, en euros'), {
      target: { value: '3200' },
    })
    // one adult, no children: the sentence speaks in the singular
    expect(screen.getByText(/Creo que ingreso más que el/)).toBeInTheDocument()
    expect(screen.getByText(/te comparamos con 38\.400\s€ por unidad de consumo/)).toBeInTheDocument()

    fireEvent.change(
      screen.getByLabelText('Porcentaje de la población que crees que vive en hogares con menos ingresos que el tuyo'),
      { target: { value: '62' } }
    )
    expect(cta).toBeEnabled()

    fireEvent.click(cta)
    expect(await screen.findByText('Componiendo tu edición…')).toBeInTheDocument()

    const title = await screen.findByRole('heading', { level: 1, name: /Tu hogar ingresa más que el/ }, { timeout: 5000 })
    expect(title).toHaveTextContent(/más que el 67\s%/)
    // the standfirst, and the same news read out by the live region
    expect(screen.getAllByText(/te infravaloraste en 5 puntos/)).toHaveLength(2)
    expect(screen.getByText(/^Tu hogar ingresa más que el 67\s% de la población de España\. Con/)).toHaveAttribute(
      'aria-live',
      'polite'
    )
    expect(screen.getByText('Así es Madrid')).toBeInTheDocument()
    expect(screen.getByText(/estudios superiores \(2023, media provincial\)/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Tu hogar, con 38\.400\s€, está en el percentil 67/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a empezar' }))
    expect(await screen.findByRole('heading', { level: 1, name: /Dónde está tu hogar/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Ingresos netos mensuales del hogar, en euros')).toHaveValue('3200')
    expect(screen.getByRole('button', { name: /Leer mi resultado/ })).toBeEnabled()
  }, 10000)

  it('flags an impossible income and adapts the grammar to the household', async () => {
    render(<PortadaApp />)
    fireEvent.change(screen.getByLabelText('Adultos en el hogar: personas de 14 años o más, tú incluido'), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText('Menores de 14 años en el hogar'), { target: { value: '1' } })
    expect(screen.getByText(/Entre todos ingresamos/)).toBeInTheDocument()
    expect(screen.getByText(/menor de 14 años/)).toBeInTheDocument()

    const income = screen.getByLabelText('Ingresos netos mensuales del hogar, en euros')
    fireEvent.change(income, { target: { value: '60000' } })
    expect(income).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/introduce un valor entre 1 y 50\.000/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Leer mi resultado/ })).toBeDisabled()
  })
})
