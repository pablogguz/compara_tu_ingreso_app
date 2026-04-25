export type IncomeValidation =
  | { state: 'empty' }
  | { state: 'invalid'; message: string }
  | { state: 'warning'; message: string }
  | { state: 'valid' }

const INVALID_RANGE_MESSAGE = 'Por favor, introduce un valor entre 1 y 50.000 €'
const ANNUAL_HINT = '⚠️ Recuerda que este valor debe ser mensual, no anual'

const MAX_MONTHLY_INCOME = 50_000
const HIGH_INCOME_HINT_THRESHOLD = 12_000

export function validateMonthlyIncome(value: number | ''): IncomeValidation {
  if (value === '') return { state: 'empty' }
  if (value <= 0) return { state: 'invalid', message: INVALID_RANGE_MESSAGE }
  if (value > MAX_MONTHLY_INCOME)
    return { state: 'invalid', message: INVALID_RANGE_MESSAGE }
  if (value > HIGH_INCOME_HINT_THRESHOLD)
    return { state: 'warning', message: ANNUAL_HINT }
  return { state: 'valid' }
}

// Accent-insensitive lowercase, used by the municipality picker for fuzzy matching.
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
