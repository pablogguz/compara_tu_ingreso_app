import { displayPercentile, euro, headline, num, outOf100 } from '@/lib/format'

// The essay's own sentences and constants, built on the shared ones in
// src/lib/format.ts.

/** Joins CSS-module class names, skipping falsy ones. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

/**
 * "De cada 100 personas en España, 86 tienen menos ingresos que tú." At the
 * very bottom, say "entre el 1 %" instead.
 */
export function sentenceFor(rawPercentile: number, place: string): string {
  return contract(rawPercentile < 1 ? `${headline(rawPercentile, place)}.` : outOf100(rawPercentile, place))
}

/** How many of 100 are below you, as prose: "86", or "menos de 1" below P1. */
export function countBelow(rawPercentile: number): string {
  return rawPercentile < 1 ? 'menos de 1' : String(displayPercentile(rawPercentile))
}

/** Spanish contractions after building a sentence around "el municipio de…": "de el" → "del". */
export function contract(text: string): string {
  return text.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al')
}

/** "1 persona", "2 personas de 14 años o más y 1 menor" */
export function householdText(adults: number, children: number): string {
  const a = adults === 1 ? '1 persona de 14 años o más' : `${adults} personas de 14 años o más`
  if (!children) return a
  return `${a} y ${children} ${children === 1 ? 'menor' : 'menores'} de 14`
}

/** "3.200 € al mes en 2024, en 12 pagas" */
export function incomeText(monthly: number, periods: 12 | 14): string {
  return `${num(monthly)} € al mes en 2024, en ${periods} pagas`
}

/** The 5.000 € bins of the histogram: 18 of them over 0–90.000 €. */
export const BIN = 5000
export const BINS = 18
export const XMAX = BIN * BINS

/** "de 35.000 a 40.000 €", or "de 85.000 € o más" for the last bin. */
export function binText(value: number): string {
  const b = Math.max(0, Math.min(BINS - 1, Math.floor(value / BIN)))
  if (b === BINS - 1) return `de ${euro(b * BIN)} o más`
  return `de ${num(b * BIN)} a ${euro((b + 1) * BIN)}`
}

/** "la provincia de Madrid", "el municipio de Madrid" */
export function levelPhrase(key: 'national' | 'provincial' | 'municipal', place: string): string {
  if (key === 'national') return 'España'
  return key === 'provincial' ? `la provincia de ${place}` : `el municipio de ${place}`
}

/** "España", "Provincia de Madrid", "Municipio de Madrid" */
export function levelTitle(key: 'national' | 'provincial' | 'municipal', place: string): string {
  if (key === 'national') return 'España'
  return key === 'provincial' ? `Provincia de ${place}` : `Municipio de ${place}`
}
