import { displayPercentile, euro, headline, num, outOf100 } from '@/prototypes/shared/format'

// The Ensayo's own sentences and constants, built on the shared ones so every
// prototype says the same thing about the same result.

export const NOTE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation/blob/main/tex/note.pdf'
export const CODE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation'

/** Joins CSS-module class names, skipping falsy ones. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

/**
 * "86 de cada 100 personas en España viven en hogares con menos ingresos que el
 * tuyo." At the very bottom that would read "1 viven…", so say "entre el 1 %".
 */
export function sentenceFor(rawPercentile: number, place: string): string {
  const p = displayPercentile(rawPercentile)
  return contract(p <= 1 ? `${headline(p, place)}.` : outOf100(p, place))
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

/** "3.200 € al mes (12 pagas)" */
export function incomeText(monthly: number, periods: 12 | 14): string {
  return `${num(monthly)} € al mes, en ${periods} pagas`
}

/** Consumption units as prose writes them: 1 → "1", 1.8 → "1,8" */
export function unitsText(units: number): string {
  const rounded = Math.round(units * 10) / 10
  return num(rounded, rounded % 1 === 0 ? 0 : 1)
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

/** Capitalise the first letter: "la provincia…" → "La provincia…" */
export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
