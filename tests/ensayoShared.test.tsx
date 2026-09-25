import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  euro,
  pct,
  naturalName,
  headline,
  outOf100,
  perceptionGap,
  displayPercentile,
} from '@/lib/format'
import { resample, curvePaths, ticks, xAt } from '@/lib/chartGeometry'

vi.mock('@/lib/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/DataContext')>()
  return {
    ...actual,
    useMunicipalities: () => ({
      municipalities: [
        { mun_code: '28079', mun_name: 'Madrid', prov_code: '28', prov_name: 'Madrid' },
        { mun_code: '28127', mun_name: 'Rozas de Madrid, Las', prov_code: '28', prov_name: 'Madrid' },
        { mun_code: '15030', mun_name: 'Coruña, A', prov_code: '15', prov_name: 'Coruña, A' },
      ],
      loading: false,
      error: null,
    }),
  }
})

import MunicipalitySearch from '@/components/ensayo/MunicipalitySearch'

afterEach(cleanup)

describe('formatting', () => {
  it('formats euros and percentages the Spanish way', () => {
    expect(euro(38400)).toMatch(/^38\.400\s€$/)
    expect(euro(5143)).toMatch(/^5\.143\s€$/)
    expect(pct(46.315)).toBe('46,3 %')
  })

  it('reads INE names naturally', () => {
    expect(naturalName('Rozas de Madrid, Las')).toBe('Las Rozas de Madrid')
    expect(naturalName('Coruña, A')).toBe('A Coruña')
    expect(naturalName("Hospitalet de Llobregat, L'")).toBe("L'Hospitalet de Llobregat")
    expect(naturalName('Madrid')).toBe('Madrid')
  })

  it('talks about people, not households, and caps at 99', () => {
    expect(headline(86, 'España')).toBe('Tu hogar ingresa más que el 86 % de la población de España')
    expect(headline(100, 'España')).toMatch(/99 %/)
    // raw 0 means below the 1st percentile; raw 1, between the 1st and 2nd
    expect(headline(0, 'Madrid')).toMatch(/entre el 1 % con menos ingresos de Madrid/)
    expect(headline(1, 'Madrid')).toMatch(/más que el 1 % de la población de Madrid/)
    expect(outOf100(0, 'España')).toMatch(/prácticamente ninguna tiene menos ingresos/)
    expect(outOf100(86, 'España')).toBe('De cada 100 personas en España, 86 tienen menos ingresos que tú.')
    expect(outOf100(1, 'España')).toMatch(/apenas 1 tiene menos ingresos/)
    expect(displayPercentile(100)).toBe(99)
  })

  it('describes the perception gap in both directions', () => {
    expect(perceptionGap(86, 62)).toMatchObject({
      diff: 24,
      kind: 'under',
      sentence: 'Creías que ingresaba más que el 62 %: te infravaloraste en 24 puntos.',
    })
    expect(perceptionGap(40, 70)).toMatchObject({ diff: -30, kind: 'over' })
    expect(perceptionGap(51, 50).kind).toBe('right')
    expect(perceptionGap(50, 50).sentence).toMatch(/lo clavaste/)
    expect(perceptionGap(86, 62, 'tu hogar').sentence).toMatch(/^Creías que tu hogar ingresaba más que el 62 %/)
  })
})

describe('chart geometry', () => {
  const density = Array.from({ length: 101 }, (_, i) => ({ x: i * 1000, y: Math.exp(-(((i - 20) / 10) ** 2)) }))

  it('resamples onto 0…xmax and normalises to the peak', () => {
    const v = resample(density, 90000, 91)
    expect(v).toHaveLength(91)
    expect(Math.max(...v)).toBeCloseTo(1, 6)
  })

  it('builds a line, an area and the area up to a split', () => {
    const p = curvePaths(resample(density, 90000), 900, 300, { xmax: 90000, split: 30000 })
    expect(p.line.startsWith('M')).toBe(true)
    expect(p.area.endsWith('Z')).toBe(true)
    expect(p.splitX).toBeCloseTo(300, 6)
    expect(p.left).toContain('L300 300')
  })

  it('clamps positions and makes round ticks', () => {
    expect(xAt(200000, 900, 90000)).toBe(900)
    expect(ticks(90000)).toEqual([0, 20000, 40000, 60000, 80000])
  })
})

describe('<MunicipalitySearch>', () => {
  it('finds municipalities by their natural name and selects with the keyboard', () => {
    const onChange = vi.fn()
    render(<MunicipalitySearch label="Municipio" value="" onChange={onChange} />)
    const input = screen.getByRole('combobox', { name: 'Municipio' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'las rozas' } })
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: /Las Rozas de Madrid/ })).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('28127')
  })

  it('shows the selected municipality and says when nothing matches', () => {
    render(<MunicipalitySearch label="Municipio" value="15030" onChange={() => {}} />)
    const input = screen.getByRole('combobox', { name: 'Municipio' })
    expect(input).toHaveValue('A Coruña (A Coruña)')
    fireEvent.focus(input)
    // coming back to a filled box doesn't open the list until you type
    expect(input).toHaveAttribute('aria-expanded', 'false')
    fireEvent.change(input, { target: { value: 'zzzz' } })
    expect(screen.getByText('Ningún municipio coincide')).toBeInTheDocument()
  })
})
