// Spanish formatting and the sentences every prototype shares, so the three
// designs say exactly the same thing about the same result.
//
// The distributions are population-weighted (each census tract counts by its
// residents), so a percentile is the share of *people* living in households
// with a lower equivalised income, not a share of households.

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

/** The percentile the UI shows: 1…99 (the raw lookup can return 100 above p99). */
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
 * The headline sentence for a level, e.g.
 * "Tu hogar ingresa más que el 86 % de la población de España".
 */
export function headline(percentile: number, place: string): string {
  const p = displayPercentile(percentile)
  if (p <= 1) return `Tu hogar está entre el 1 % con menos ingresos de ${place}`
  return `Tu hogar ingresa más que el ${p} % de la población de ${place}`
}

/** "De cada 100 personas en España, 86 viven en hogares con menos ingresos que el tuyo." */
export function outOf100(percentile: number, place: string): string {
  const p = displayPercentile(percentile)
  if (p <= 1) {
    return `De cada 100 personas en ${place}, apenas 1 vive en un hogar con menos ingresos que el tuyo.`
  }
  return `De cada 100 personas en ${place}, ${p} viven en hogares con menos ingresos que el tuyo.`
}

export interface PerceptionGap {
  /** actual − guess, in percentile points */
  diff: number
  /** "under" = you placed yourself lower than you are */
  kind: 'under' | 'over' | 'right'
  sentence: string
}

/** How the user's guess compares with the national result. */
export function perceptionGap(actualRaw: number, guess: number): PerceptionGap {
  const actual = displayPercentile(actualRaw)
  const diff = actual - guess
  if (Math.abs(diff) <= 2) {
    return { diff, kind: 'right', sentence: `Creías estar en el ${guess}: casi lo clavas.` }
  }
  if (diff > 0) {
    return {
      diff,
      kind: 'under',
      sentence: `Creías estar en el ${guess}: te infravaloraste en ${diff} puntos.`,
    }
  }
  return {
    diff,
    kind: 'over',
    sentence: `Creías estar en el ${guess}: te sobrevaloraste en ${-diff} puntos.`,
  }
}

/** Modified OECD scale, spelled out: "1 + 0,5 + 0,3 = 1,8 unidades de consumo". */
export function scaleExplained(adults: number, children: number): string {
  const parts = ['1']
  for (let i = 1; i < adults; i++) parts.push('0,5')
  for (let i = 0; i < children; i++) parts.push('0,3')
  const units = 1 + Math.max(0, adults - 1) * 0.5 + children * 0.3
  const unitsText = num(units, units % 1 === 0 ? 0 : 1)
  const label = units === 1 ? 'unidad de consumo' : 'unidades de consumo'
  return parts.length === 1 ? `${unitsText} ${label}` : `${parts.join(' + ')} = ${unitsText} ${label}`
}

/** A short text for sharing a result. */
export function shareText(percentile: number, place = 'España'): string {
  return `${headline(percentile, place)}. Compruébalo en comparatuingreso.es`
}
