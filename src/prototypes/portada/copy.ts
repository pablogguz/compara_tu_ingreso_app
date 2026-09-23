// The paper's own copy: grammar helpers and the sentences specific to this
// design. The sentences every prototype shares live in ../shared/format.ts.
import { displayPercentile, euro } from '../shared/format'

export const NOTE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation/blob/main/tex/note.pdf'
export const CODE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation'

/** 1 → "adulto", 2 → "adultos" */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/** ["a"] → "a"; ["a", "b"] → "a y b"; ["a", "b", "c"] → "a, b y c" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** Digits only ("3.200,50 €" → "3200"); '' when there are none. */
export function digitsOf(text: string): string {
  return text.split(',')[0].replace(/\D/g, '')
}

/** Splits a headline around its percentage so the number can be set in red. */
export function splitAtPercent(text: string): { before: string; figure: string; after: string } {
  const m = text.match(/(\d+)\s%/)
  if (!m || m.index === undefined) return { before: text, figure: '', after: '' }
  return {
    before: text.slice(0, m.index),
    // narrow no-break space, as a typesetter would
    figure: `${m[1]} %`,
    after: text.slice(m.index + m[0].length),
  }
}

/** "86 de cada 100 personas en España viven en hogares con menos ingresos que el tuyo" */
export function countSentence(percentile: number, place: string): string {
  const p = displayPercentile(percentile)
  if (p <= 1) return `menos de 1 de cada 100 personas en ${place} vive en un hogar con menos ingresos que el tuyo`
  return `${p} de cada 100 personas en ${place} viven en hogares con menos ingresos que el tuyo`
}

/** The standfirst under the results headline. */
export function standfirst(equivIncome: number, percentile: number, gapSentence: string): string {
  return `Con ${euro(equivIncome)} al año por unidad de consumo, ${countSentence(percentile, 'España')}. ${gapSentence}`
}

/** The short label inside the dark area of the chart. */
export function countLabel(percentile: number): string {
  const p = displayPercentile(percentile)
  return p <= 1 ? 'Menos de 1 de cada 100 personas' : `${p} de cada 100 personas`
}

/** Drops the emoji the shared validation messages start with. */
export function plainMessage(message: string): string {
  return message.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}
