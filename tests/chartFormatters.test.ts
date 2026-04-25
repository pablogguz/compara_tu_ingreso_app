import { describe, it, expect } from 'vitest'
import { formatEuros, formatAxisEuros } from '@/lib/charts/formatters'

describe('formatEuros', () => {
  it('formats integer euro values with Spanish locale', () => {
    const out = formatEuros(32500)
    expect(out).toMatch(/32\.500/)
    expect(out).toContain('€')
  })

  it('rounds non-integer values', () => {
    expect(formatEuros(99.49)).toMatch(/99/)
    expect(formatEuros(99.51)).toMatch(/100/)
  })

  it('handles zero', () => {
    expect(formatEuros(0)).toMatch(/0/)
  })
})

describe('formatAxisEuros', () => {
  it('renders compact k€ for values >= 1000', () => {
    expect(formatAxisEuros(1000)).toBe('1k €')
    expect(formatAxisEuros(15000)).toBe('15k €')
    expect(formatAxisEuros(123456)).toBe('123k €')
  })

  it('renders raw euros for values < 1000', () => {
    expect(formatAxisEuros(0)).toBe('0 €')
    expect(formatAxisEuros(500)).toBe('500 €')
    expect(formatAxisEuros(999)).toBe('999 €')
  })

  it('rounds before formatting', () => {
    expect(formatAxisEuros(1499)).toBe('1k €')
    expect(formatAxisEuros(1500)).toBe('2k €')
  })
})
