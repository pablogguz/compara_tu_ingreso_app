import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADRH_YEAR, BIRTHPLACE_YEAR, EDUCATION_YEAR, INCOME_YEAR } from '@/lib/years'

// The app asks for income in the year the distributions are nowcast to; that year is set in the
// pipeline, so the two must agree.
const nowcast = readFileSync(path.join(__dirname, '..', 'methodology', 'code', '0d. nowcast.r'), 'utf8')
const munStats = readFileSync(path.join(__dirname, '..', 'methodology', 'code', '3a. mun_stats.r'), 'utf8')
const year = (name: string, source = nowcast) => Number(source.match(new RegExp(`^${name} <- (\\d{4})`, 'm'))?.[1])

describe('income years', () => {
  it('match the nowcast in the pipeline', () => {
    expect(INCOME_YEAR).toBe(year('TARGET_INCOME_YEAR'))
    expect(ADRH_YEAR).toBe(year('BASE_INCOME_YEAR'))
  })

  it('match the census periods behind the municipal context', () => {
    expect(EDUCATION_YEAR).toBe(year('EDUC_PERIOD', munStats))
    expect(BIRTHPLACE_YEAR).toBe(year('FOREIGN_PERIOD', munStats))
  })
})
