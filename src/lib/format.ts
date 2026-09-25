// Spanish formatting and the sentences the site uses about a result.
//
// The distributions are population-weighted (each census tract counts by its
// residents, with the household's income per consumption unit), so a
// percentile is a share of *people*: "86 de cada 100 personas tienen menos
// ingresos que tú", not a share of households.

const euroFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  // es-ES leaves 4-digit numbers ungrouped ("5143 €"); group them like the rest
  useGrouping: 'always' as unknown as boolean,
})

const numberFormat = (digits: number) =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: 'always' as unknown as boolean,
  })

/** 38400 → "38.400 €" */
export function euro(value: number): string {
  return euroFormat.format(Math.round(value))
}

/** 3200 → "3.200"; (1.8, 1) → "1,8" */
export function num(value: number, digits = 0): string {
  return numberFormat(digits).format(value)
}

/** 46.315 → "46,3 %" */
export function pct(value: number, digits = 1): string {
  return `${num(value, digits)} %`
}

/** The percentile the UI shows as a number: 1…99 (the raw lookup returns 0
 *  below P1 and 100 above P99). Wording should test the raw value. */
export function displayPercentile(raw: number): number {
  return Math.min(99, Math.max(1, Math.round(raw)))
}

/** "Rozas de Madrid, Las" → "Las Rozas de Madrid"; "Coruña, A" → "A Coruña". */
export function naturalName(name: string): string {
  const m = name.match(/^(.*), (El|La|Los|Las|L'|A|O|Os|As|Es|Sa|Ses|S'|Els|Les|Lo)$/)
  if (!m) return name
  const [, rest, article] = m
  return article.endsWith("'") ? `${article}${rest}` : `${article} ${rest}`
}

/**
 * The headline sentence for a level, from the raw percentile, e.g.
 * "Tu hogar ingresa más que el 86 % de la población de España". Below the
 * 1st percentile (raw 0): "Tu hogar está entre el 1 % con menos ingresos…".
 */
export function headline(rawPercentile: number, place: string): string {
  if (rawPercentile < 1) return `Tu hogar está entre el 1 % con menos ingresos de ${place}`
  return `Tu hogar ingresa más que el ${displayPercentile(rawPercentile)} % de la población de ${place}`
}

/** "De cada 100 personas en España, 86 tienen menos ingresos que tú." (raw percentile) */
export function outOf100(rawPercentile: number, place: string): string {
  if (rawPercentile < 1) return `De cada 100 personas en ${place}, prácticamente ninguna tiene menos ingresos que tú.`
  const p = displayPercentile(rawPercentile)
  if (p === 1) return `De cada 100 personas en ${place}, apenas 1 tiene menos ingresos que tú.`
  return `De cada 100 personas en ${place}, ${p} tienen menos ingresos que tú.`
}

export interface PerceptionGap {
  /** actual − guess, in percentile points */
  diff: number
  /** "under" = you placed yourself lower than you are */
  kind: 'under' | 'over' | 'right'
  sentence: string
}

/**
 * How the user's guess compares with the national result:
 * "Creías que ingresaba más que el 62 %: te infravaloraste en 24 puntos."
 * The sentence follows the headline ("Tu hogar ingresa…"); pass `subject`
 * ("tu hogar") where it stands on its own.
 */
export function perceptionGap(actualRaw: number, guess: number, subject?: string): PerceptionGap {
  const actual = displayPercentile(actualRaw)
  const diff = actual - guess
  const thought = `Creías que ${subject ? `${subject} ` : ''}ingresaba más que el ${guess} %`
  if (diff === 0) return { diff, kind: 'right', sentence: `${thought}: lo clavaste.` }
  if (Math.abs(diff) <= 2) return { diff, kind: 'right', sentence: `${thought}: casi lo clavas.` }
  if (diff > 0) return { diff, kind: 'under', sentence: `${thought}: te infravaloraste en ${diff} puntos.` }
  return { diff, kind: 'over', sentence: `${thought}: te sobrevaloraste en ${-diff} puntos.` }
}

/** A short text for sharing a result. */
export function shareText(rawPercentile: number, place = 'España'): string {
  return `${headline(rawPercentile, place)}. Compruébalo en comparatuingreso.es`
}
