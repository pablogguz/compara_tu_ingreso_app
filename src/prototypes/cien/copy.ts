import { displayPercentile, headline, num, outOf100 } from '@/prototypes/shared/format'

// Copy specific to Cien, built on the shared sentences so all three
// prototypes say the same thing about the same result.

/**
 * "De cada 100 personas en España, 86 viven en hogares con menos ingresos que
 * el tuyo." At the very bottom (the lookup clamps to 1) that sentence would
 * read "1 viven…" and overstate it, so say "entre el 1 % con menos ingresos".
 */
export function sentenceFor(rawPercentile: number, place: string): string {
  const p = displayPercentile(rawPercentile)
  return p <= 1 ? `${headline(p, place)}.` : outOf100(p, place)
}

/** "1 adulto", "2 adultos, 1 menor" — the household in a few words. */
export function householdShort(adults: number, children: number): string {
  const a = `${adults} ${adults === 1 ? 'adulto' : 'adultos'}`
  if (!children) return a
  return `${a}, ${children} ${children === 1 ? 'menor' : 'menores'}`
}

/** "3.200 € al mes" or "3.200 € × 14 pagas" */
export function incomeShort(monthly: number, periods: 12 | 14): string {
  return periods === 14 ? `${num(monthly)} € × 14 pagas` : `${num(monthly)} € al mes`
}

/** Consumption units as the explanation writes them: 1 → "1", 1.8 → "1,8" */
export function unitsText(units: number): string {
  const rounded = Math.round(units * 10) / 10
  return num(rounded, rounded % 1 === 0 ? 0 : 1)
}
