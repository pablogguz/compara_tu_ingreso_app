import type { Municipality, MunicipalityStats } from '@/types'

export const MUNICIPALITIES: Municipality[] = [
  { mun_code: '28005', mun_name: 'Aranjuez', prov_code: '28', prov_name: 'Madrid' },
  { mun_code: '08019', mun_name: 'Barcelona', prov_code: '08', prov_name: 'Barcelona' },
  { mun_code: '28079', mun_name: 'Madrid', prov_code: '28', prov_name: 'Madrid' },
  { mun_code: '41091', mun_name: 'Sevilla', prov_code: '41', prov_name: 'Sevilla' },
  { mun_code: '29067', mun_name: 'Málaga', prov_code: '29', prov_name: 'Málaga' },
]

// 99 ascending thresholds; percentile p has value p * step.
export const percentiles = (step: number): number[] =>
  Array.from({ length: 99 }, (_, i) => (i + 1) * step)

export const NATIONAL = percentiles(1000) // 30 000 → p30
export const PROVINCIAL = percentiles(500) // 30 000 → p60
export const MUNICIPAL = percentiles(2000) // 30 000 → p15

export const MADRID_STATS: Omit<MunicipalityStats, 'mun_code'> = {
  net_income_equiv: 21500,
  net_income_equiv_is_imputed: 0,
  pct_higher_ed_completed: 38.4,
  pct_higher_ed_completed_is_imputed: 0,
  pct_foreign_born: 17.2,
  pct_foreign_born_is_imputed: 1,
}

export const DENSITY = Array.from({ length: 50 }, (_, i) => ({
  x: i * 2000,
  y: Math.exp(-Math.pow((i - 12) / 8, 2)),
}))
