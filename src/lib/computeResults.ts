import type { CalculatedResults, Municipality } from '@/types'
import { calculateEquivIncome, findPercentile } from './calculations'
import {
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
} from './dataLoader'
import { findMunicipality } from './DataContext'

export interface ResultsQuery {
  municipality: string
  monthlyIncome: number
  paymentPeriods: 12 | 14
  adults: number
  children: number
}

// 14-pagas: the entered "monthly" figure is one of 14 payments. Annualise by
// multiplying *14, then divide by 12 to keep the equivalence-scale math in a
// 12-month frame.
export function monthlyIncomeIn12(monthlyIncome: number, paymentPeriods: 12 | 14): number {
  return paymentPeriods === 14 ? (monthlyIncome * 14) / 12 : monthlyIncome
}

// The household's percentile at the three levels. Shared by the questionnaire
// and the /mocks screens so both go through exactly the same math.
export async function computeResults(
  query: ResultsQuery,
  municipalities: Municipality[]
): Promise<CalculatedResults> {
  const selected = findMunicipality(municipalities, query.municipality)
  if (!selected) throw new Error(`Municipality not found: ${query.municipality}`)

  const equivIncome = calculateEquivIncome(
    monthlyIncomeIn12(query.monthlyIncome, query.paymentPeriods),
    query.adults,
    query.children
  )

  const [nationalPerc, provincialPerc, municipalPerc] = await Promise.all([
    loadNationalPercentiles(),
    loadProvincialPercentiles(selected.prov_code),
    loadMunicipalPercentiles(query.municipality),
  ])

  return {
    equiv_income: equivIncome,
    national_percentile: findPercentile(equivIncome, nationalPerc),
    provincial_percentile: findPercentile(equivIncome, provincialPerc),
    municipal_percentile: findPercentile(equivIncome, municipalPerc),
    selected_prov: selected.prov_code,
  }
}
