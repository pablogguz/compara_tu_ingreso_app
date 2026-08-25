import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import MunicipalityStep, {
  rankOptions,
  type MunicipalityOption,
} from '@/components/questions/MunicipalityStep'
import { MUNICIPALITIES } from './helpers/mockData'

// Feed the picker a fixed list without going through DataProvider/fetch.
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

afterEach(cleanup)

const OPTIONS: MunicipalityOption[] = MUNICIPALITIES.map((m) => ({
  value: m.mun_code,
  label: `${m.mun_name} (${m.prov_name})`,
  munName: m.mun_name,
  provName: m.prov_name,
}))

describe('rankOptions', () => {
  it('returns everything untouched for an empty search', () => {
    expect(rankOptions(OPTIONS, '')).toBe(OPTIONS)
  })

  it('puts an exact municipality match before province-only matches', () => {
    const ranked = rankOptions(OPTIONS, 'madrid')
    expect(ranked.map((o) => o.munName)).toEqual(['Madrid', 'Aranjuez'])
  })

  it('is accent- and case-insensitive', () => {
    expect(rankOptions(OPTIONS, 'MALAGA').map((o) => o.munName)).toEqual(['Málaga'])
  })

  it('drops non-matches', () => {
    expect(rankOptions(OPTIONS, 'zzz')).toEqual([])
  })

  it('prefers the shorter name among equally-scored prefix matches', () => {
    const withLong: MunicipalityOption[] = [
      { value: '1', label: 'Madremanya (Girona)', munName: 'Madremanya', provName: 'Girona' },
      ...OPTIONS,
    ]
    expect(rankOptions(withLong, 'madr').map((o) => o.munName)).toEqual([
      'Madrid',
      'Madremanya',
      'Aranjuez',
    ])
  })

  it('returns fresh objects so react-select re-focuses the top match', () => {
    const ranked = rankOptions(OPTIONS, 'ma')
    expect(ranked[0]).toEqual(OPTIONS[2])
    expect(ranked[0]).not.toBe(OPTIONS[2])
  })
})

describe('<MunicipalityStep />', () => {
  function setup(value = '') {
    const onChange = vi.fn()
    const onNext = vi.fn()
    render(<MunicipalityStep value={value} onChange={onChange} onNext={onNext} />)
    return { onChange, onNext }
  }

  const combobox = () =>
    screen.getByRole('combobox', { name: /municipio de residencia/i })

  it('keeps "Siguiente" disabled until a municipality is chosen', () => {
    const { onNext } = setup('')
    const next = screen.getByRole('button', { name: /siguiente/i })
    expect(next).toBeDisabled()
    fireEvent.click(next)
    expect(onNext).not.toHaveBeenCalled()
  })

  it('shows the chosen municipality and enables "Siguiente"', () => {
    const { onNext } = setup('08019')
    expect(screen.getByText('Barcelona (Barcelona)')).toBeInTheDocument()
    const next = screen.getByRole('button', { name: /siguiente/i })
    expect(next).toBeEnabled()
    fireEvent.click(next)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('typing a name and pressing Enter selects the best match, not the first file-order match', () => {
    const { onChange } = setup('')
    const input = combobox()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'madrid' } })
    // Menu header reflects the filtered count (Madrid + Aranjuez/Madrid)
    expect(screen.getByText('2 resultados')).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('28079')
  })

  it('keyboard focus follows the ranking as the search narrows', () => {
    // "a" → Aranjuez is the top prefix match and gets focus.
    // "ma" → Madrid is now top; Aranjuez only matches via its province.
    // Enter must pick Madrid, not the previously focused Aranjuez.
    const { onChange } = setup('')
    const input = combobox()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: 'ma' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('28079')
  })

  it('shows the total count when the menu opens without a search', () => {
    setup('')
    const input = combobox()
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(screen.getByText(/5 municipios · escribe para buscar/i)).toBeInTheDocument()
  })
})
