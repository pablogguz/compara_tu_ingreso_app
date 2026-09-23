// The form's own voice: formal "usted", administrative, dry. Same meaning and
// edge cases as the shared sentences in ../shared/format.ts (which speak "tú").
//
// The distributions are population-weighted: a percentile is the share of
// *people* living in households with a lower income per consumption unit.
import { displayPercentile, num, perceptionGap } from '../shared/format'

export const YEAR = 2024
export const NOTE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation/blob/main/tex/note.pdf'
export const CODE_URL = 'https://github.com/pablogguz/compara_tu_ingreso_validation'

/** narrow no-break space, between a figure and its % sign */
export const NNBSP = '\u202F'

/** 86 → "86 %" (narrow no-break space) */
export function percent(p: number): string {
  return `${p}${NNBSP}%`
}

/** 3200 → "3.200,00 €" — the form writes amounts with cents. */
export function amount(value: number): string {
  return `${num(value, 2)} €`
}

/** Consumption units always with one decimal: 1 → "1,0", 1.8 → "1,8". */
export function unitsText(units: number): string {
  return num(units, 1)
}

/** "Su hogar ingresa más que el 86 % de la población de España." */
export function headlineUsted(raw: number, place: string): string {
  const p = displayPercentile(raw)
  if (p <= 1) return `Su hogar está entre el 1${NNBSP}% con menos ingresos de ${place}.`
  return `Su hogar ingresa más que el ${p}${NNBSP}% de la población de ${place}.`
}

/** "De cada 100 personas en España, 86 viven en hogares con menos ingresos que el suyo." */
export function outOf100Usted(raw: number, place: string): string {
  const p = displayPercentile(raw)
  if (p <= 1) {
    return `De cada 100 personas en ${place}, apenas 1 vive en un hogar con menos ingresos que el suyo.`
  }
  return `De cada 100 personas en ${place}, ${p} viven en hogares con menos ingresos que el suyo.`
}

export interface GapCopy {
  /** actual − guess, in percentile points */
  diff: number
  kind: 'under' | 'over' | 'right'
  /** box 13 as printed: "+24", "−12", "0" */
  signed: string
  /** the sentence under the headline */
  long: string
  /** the phone version */
  short: string
}

const points = (n: number) => `${n} ${n === 1 ? 'punto' : 'puntos'}`

/** How box 06 (the guess) compares with box 10 (the national result). */
export function gapUsted(actualRaw: number, guess: number): GapCopy {
  const { diff, kind } = perceptionGap(actualRaw, guess)
  const d = Math.abs(diff)
  const signed = diff > 0 ? `+${diff}` : diff < 0 ? `\u2212${d}` : '0'
  const opening = `En la casilla 06 declaró ${guess}`
  if (kind === 'right') {
    if (diff === 0) {
      return {
        diff,
        kind,
        signed,
        long: `${opening}: lo clava. La casilla 13 queda a cero.`,
        short: `${opening}: lo clava.`,
      }
    }
    return {
      diff,
      kind,
      signed,
      long: `${opening}: casi lo clava. La diferencia, ${points(d)}, figura en la casilla 13 de la liquidación.`,
      short: `${opening}: casi lo clava.`,
    }
  }
  const verb = kind === 'under' ? 'se infravaloró' : 'se sobrevaloró'
  return {
    diff,
    kind,
    signed,
    long: `${opening}: ${verb} en ${points(d)}. La diferencia figura en la casilla 13 de la liquidación.`,
    short: `${opening}: ${points(d)} por ${kind === 'under' ? 'debajo' : 'encima'}.`,
  }
}

/** "28079-2024-0086" */
export function receiptNumber(munCode: string, percentile: number): string {
  return `${munCode}-${YEAR}-${String(displayPercentile(percentile)).padStart(4, '0')}`
}

/**
 * Box 08 spelled out, as scaleExplained() does but with the form's one-decimal
 * result: "1,0", "1 + 0,5 + 0,3 = 1,8". Large households are grouped:
 * "1 + 4 × 0,5 + 3 × 0,3 = 3,9".
 */
export function unitsSum(adults: number, children: number): string {
  const units = 1 + Math.max(0, adults - 1) * 0.5 + children * 0.3
  const total = unitsText(units)
  const terms = Math.max(1, adults) + children
  if (terms <= 1) return total
  if (terms <= 5) {
    const parts = ['1']
    for (let i = 1; i < adults; i++) parts.push('0,5')
    for (let i = 0; i < children; i++) parts.push('0,3')
    return `${parts.join(' + ')} = ${total}`
  }
  const parts = ['1']
  if (adults > 1) parts.push(adults === 2 ? '0,5' : `${adults - 1} × 0,5`)
  if (children > 0) parts.push(children === 1 ? '0,3' : `${children} × 0,3`)
  return `${parts.join(' + ')} = ${total}`
}

/** ["01"] → "01"; ["01", "06"] → "01 y 06"; ["01", "02", "06"] → "01, 02 y 06" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/**
 * What stops the form from being presented, next to the submit button:
 * "Faltan las casillas 01 y 06 y la declaración." / "Revise la casilla 02."
 */
export function missingSummary(missing: string[], invalid: string[], declared: boolean): string {
  const out: string[] = []
  const boxes = (list: string[]) =>
    list.length === 1 ? `la casilla ${list[0]}` : `las casillas ${listJoin(list)}`
  if (missing.length && !declared) out.push(`Faltan ${boxes(missing)} y la declaración.`)
  else if (missing.length) out.push(`${missing.length === 1 ? 'Falta' : 'Faltan'} ${boxes(missing)}.`)
  else if (!declared) out.push('Falta marcar la declaración.')
  if (invalid.length) out.push(`Revise ${boxes(invalid)}.`)
  return out.length ? out.join(' ') : 'Casillas completas. Puede presentar la declaración.'
}

/** "3.200,50 €", "3200", "3.200" → 3200.5 / 3200 / 3200; '' when empty or unreadable. */
export function parseAmount(text: string): number | '' {
  const t = text.replace(/[\s€\u202F\u00A0]/g, '')
  if (!t) return ''
  let normal: string
  if (t.includes(',')) {
    const [int, dec = ''] = t.split(',')
    normal = `${int.replace(/\./g, '')}.${dec.replace(/\D/g, '').slice(0, 2)}`
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    normal = t.replace(/\./g, '')
  } else {
    const [int, ...rest] = t.split('.')
    normal = rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int
  }
  const n = Number(normal)
  return Number.isFinite(n) && normal !== '.' ? n : ''
}

/** Editable text for an amount: 3200 → "3200"; 3200.5 → "3200,5". */
export function editableAmount(value: number | ''): string {
  if (value === '') return ''
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

/** Today, as a registry stamp prints it: "23 SEP 2026". */
export function stampDate(date = new Date()): string {
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

/** Deterministic bar/space widths (in units) for a decorative barcode. */
export function barcodeWidths(code: string): number[] {
  const out = [1, 1, 1, 1]
  for (const ch of code.replace(/\W/g, '')) {
    const c = ch.charCodeAt(0)
    out.push(1 + ((c * 7) % 4), 1 + ((c >> 1) % 2))
  }
  out.push(1, 1, 2)
  return out
}
