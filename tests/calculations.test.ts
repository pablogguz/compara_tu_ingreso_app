import { describe, it, expect } from 'vitest'
import {
  calculateEquivIncome,
  findPercentile,
  findValueForPercentile,
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '@/lib/calculations'

describe('calculateEquivIncome (modified OECD scale)', () => {
  it('single-adult household: scale = 1, equiv = annualised income', () => {
    expect(calculateEquivIncome(2000, 1, 0)).toBe(24000)
  })

  it('two adults: scale = 1.5', () => {
    // 2000 * 12 / 1.5 = 16000
    expect(calculateEquivIncome(2000, 2, 0)).toBe(16000)
  })

  it('one adult + one child: scale = 1.3', () => {
    // 2000 * 12 / 1.3 = 18461.538…
    expect(calculateEquivIncome(2000, 1, 1)).toBeCloseTo(18461.54, 1)
  })

  it('two adults + two children: scale = 1 + 0.5 + 0.6 = 2.1', () => {
    // 3000 * 12 / 2.1 = 17142.857…
    expect(calculateEquivIncome(3000, 2, 2)).toBeCloseTo(17142.86, 1)
  })

  it('clamps adults below 1: max(0, adults-1) ensures non-negative scale add', () => {
    // adults = 0: scale = 1 + max(0, -1)*0.5 + 0 = 1
    expect(calculateEquivIncome(1000, 0, 0)).toBe(12000)
  })
})

describe('findPercentile', () => {
  // Synthetic 99-element ascending array: [1000, 2000, 3000, ..., 99000]
  const percentiles = Array.from({ length: 99 }, (_, i) => (i + 1) * 1000)

  it('returns 0 below the lowest percentile and 1 from it', () => {
    expect(findPercentile(500, percentiles)).toBe(0)
    expect(findPercentile(999, percentiles)).toBe(0)
    expect(findPercentile(1000, percentiles)).toBe(1)
    expect(findPercentile(1500, percentiles)).toBe(1)
  })

  it('returns 100 for values at or above the highest percentile', () => {
    expect(findPercentile(99000, percentiles)).toBe(100)
    expect(findPercentile(150000, percentiles)).toBe(100)
  })

  it('returns the largest p where percentiles[p-1] <= value', () => {
    expect(findPercentile(2000, percentiles)).toBe(2)
    expect(findPercentile(2500, percentiles)).toBe(2)
    expect(findPercentile(50000, percentiles)).toBe(50)
    expect(findPercentile(50500, percentiles)).toBe(50)
  })
})

describe('findValueForPercentile', () => {
  const percentiles = Array.from({ length: 99 }, (_, i) => (i + 1) * 1000)

  it('clamps below 1 to the first entry', () => {
    expect(findValueForPercentile(0, percentiles)).toBe(1000)
    expect(findValueForPercentile(1, percentiles)).toBe(1000)
  })

  it('clamps at or above 100 to the last entry', () => {
    expect(findValueForPercentile(100, percentiles)).toBe(99000)
    expect(findValueForPercentile(150, percentiles)).toBe(99000)
  })

  it('returns the value at the (1-indexed) percentile', () => {
    expect(findValueForPercentile(50, percentiles)).toBe(50000)
    expect(findValueForPercentile(99, percentiles)).toBe(99000)
  })
})

describe('formatCurrency (es-ES)', () => {
  it('renders euros with no decimals and Spanish thousand separator', () => {
    const out = formatCurrency(32500)
    // U+00A0 (NBSP) before €, Spanish locale uses '.' as thousand separator
    expect(out).toMatch(/32\.500/)
    expect(out).toContain('€')
  })

  it('rounds to nearest integer', () => {
    expect(formatCurrency(99.4)).toMatch(/99/)
    expect(formatCurrency(99.6)).toMatch(/100/)
  })
})

describe('formatNumber + formatPercentage', () => {
  it('formatNumber rounds to integer (locale separator depends on ICU build)', () => {
    // 1234.5 → either "1.235" (full ICU) or "1235" (small-ICU) depending on the
    // node build. Both must round to integer 1235.
    const out = formatNumber(1234.5)
    expect(out.replace(/[^0-9]/g, '')).toBe('1235')
  })

  it('formatPercentage renders one decimal with %', () => {
    expect(formatPercentage(12.345)).toBe('12.3%')
    expect(formatPercentage(0)).toBe('0.0%')
  })
})
