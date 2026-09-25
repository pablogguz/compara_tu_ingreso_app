import { describe, it, expect } from 'vitest'
import { rankOptions, type MunicipalityOption } from '@/lib/municipalitySearch'
import { MUNICIPALITIES } from './helpers/mockData'

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

})
