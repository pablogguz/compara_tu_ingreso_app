// Type definitions for the income comparison app

export interface PercentileData {
  percentile: number;
  value: number;
}

export interface ProvincialPercentiles {
  percentile: number;
  [provCode: string]: number;
}

export interface MunicipalPercentiles {
  percentile: number;
  [munCode: string]: number;
}

export interface Municipality {
  mun_code: string;
  mun_name: string;
  prov_code: string;
  prov_name: string;
}

export interface DensityPoint {
  x: number;
  y: number;
}

export interface ProvincialDensity {
  prov_code: string;
  x: number;
  y: number;
}

export interface MunicipalDensity {
  mun_code: string;
  x: number;
  y: number;
}

export interface MunicipalityStats {
  mun_code: string;
  net_income_equiv: number;
  net_income_equiv_is_imputed: number;
  pct_higher_ed_completed: number;
  pct_higher_ed_completed_is_imputed: number;
  pct_foreign_born: number;
  pct_foreign_born_is_imputed: number;
}

export interface UserInput {
  municipality: string
  monthlyIncome: number
  adults: number
  children: number
  perceivedPercentile: number
  calculationPromise?: Promise<CalculatedResults>
}

export interface CalculatedResults {
  equiv_income: number;
  national_percentile: number;
  provincial_percentile: number;
  municipal_percentile: number;
  selected_prov: string;
}

export type ViewType = 'national' | 'provincial' | 'municipal';

export interface ResponseData {
  timestamp: string;
  municipality: string;
  monthly_income: number;
  adults: number;
  children: number;
  perceived_percentile: number;
  actual_percentile: number;
  equiv_income: number;
}
