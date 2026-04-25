import { describe, it, expect } from 'vitest'
import { validateMonthlyIncome, normalizeText } from '@/lib/validation'

describe('validateMonthlyIncome', () => {
  it('empty value returns empty state', () => {
    expect(validateMonthlyIncome('')).toEqual({ state: 'empty' })
  })

  it('zero or negative is invalid', () => {
    expect(validateMonthlyIncome(0).state).toBe('invalid')
    expect(validateMonthlyIncome(-100).state).toBe('invalid')
  })

  it('above 50,000 is invalid', () => {
    const result = validateMonthlyIncome(50001)
    expect(result.state).toBe('invalid')
    if (result.state === 'invalid') {
      expect(result.message).toMatch(/50\.000/)
    }
  })

  it('between 12,001 and 50,000 raises a warning (likely annual)', () => {
    const result = validateMonthlyIncome(15000)
    expect(result.state).toBe('warning')
    if (result.state === 'warning') {
      expect(result.message).toMatch(/mensual/)
    }
  })

  it('typical monthly values are valid', () => {
    expect(validateMonthlyIncome(2500)).toEqual({ state: 'valid' })
    expect(validateMonthlyIncome(1)).toEqual({ state: 'valid' })
    expect(validateMonthlyIncome(12000)).toEqual({ state: 'valid' })
  })

  it('boundary at 12,001 flips to warning', () => {
    expect(validateMonthlyIncome(12000).state).toBe('valid')
    expect(validateMonthlyIncome(12001).state).toBe('warning')
  })
})

describe('normalizeText', () => {
  it('lowercases', () => {
    expect(normalizeText('MADRID')).toBe('madrid')
  })

  it('strips accents', () => {
    expect(normalizeText('Málaga')).toBe('malaga')
    expect(normalizeText('Cáceres')).toBe('caceres')
    expect(normalizeText('Ávila')).toBe('avila')
  })

  it('trims whitespace', () => {
    expect(normalizeText('  Vigo  ')).toBe('vigo')
  })

  it('handles ñ (it remains ñ — only combining diacritics are stripped)', () => {
    // U+00F1 is a precomposed character; NFD splits to n + tilde-combining,
    // then the combining mark is removed → leaves 'n'.
    expect(normalizeText('España')).toBe('espana')
  })

  it('idempotent on already-normalized text', () => {
    expect(normalizeText(normalizeText('Sevilla'))).toBe('sevilla')
  })
})
