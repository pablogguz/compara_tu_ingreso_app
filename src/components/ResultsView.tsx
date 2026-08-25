'use client'

import { useMemo, useState } from 'react'
import type { UserInput, CalculatedResults, ViewType } from '@/types'
import { useMunicipalities, findMunicipality } from '@/lib/DataContext'
import { formatCurrency } from '@/lib/calculations'
import { useCountUp } from '@/hooks/useCountUp'
import DistributionChart from './DistributionChart'
import StatsCards from './StatsCards'
import { ErrorBoundary } from './ErrorBoundary'

interface ResultsViewProps {
  userInput: UserInput
  results: CalculatedResults
  onRecalculate: () => void
}

const VIEWS: ViewType[] = ['national', 'provincial', 'municipal']

const viewLabels: Record<ViewType, string> = {
  national: 'Nacional',
  provincial: 'Provincial',
  municipal: 'Municipal',
}

export function buildHeadline(percentile: number, placeName: string): string {
  return percentile <= 1
    ? `Tu hogar estuvo entre el 1% más pobre de ${placeName}`
    : `Tu hogar ingresó más que el ${percentile}% de la población en ${placeName}`
}

export default function ResultsView({
  userInput,
  results,
  onRecalculate,
}: ResultsViewProps) {
  const [viewType, setViewType] = useState<ViewType>('national')
  const { municipalities } = useMunicipalities()

  const { municipalityName, provinceName } = useMemo(() => {
    const m = findMunicipality(municipalities, userInput.municipality)
    return {
      municipalityName: m?.mun_name ?? 'tu municipio',
      provinceName: m?.prov_name ?? 'tu provincia',
    }
  }, [municipalities, userInput.municipality])

  const currentPercentile =
    viewType === 'national'
      ? results.national_percentile
      : viewType === 'provincial'
        ? results.provincial_percentile
        : results.municipal_percentile

  const displayPercentile = Math.min(99, currentPercentile)
  const animatedPercentile = useCountUp(displayPercentile, 1100)

  const placeName =
    viewType === 'national'
      ? 'España'
      : viewType === 'provincial'
        ? provinceName
        : municipalityName

  const headline = buildHeadline(displayPercentile, placeName)

  return (
    <div className="results-container">
      <section className="results-hero" aria-labelledby="results-headline">
        <div className="result-header">
          <div className="result-eyebrow">
            Tu hogar en 2024 · <strong>{placeName}</strong>
          </div>
          <div className="percentile-display" aria-hidden="true">
            <span className="percentile-number">{animatedPercentile}</span>
            <span className="percentile-symbol">%</span>
          </div>
          <h2 className="result-text" id="results-headline">
            {headline}
          </h2>
          <div className="result-meta">
            <i className="fas fa-coins" aria-hidden="true"></i>
            <span>Ingresos anuales equivalentes</span>
            <strong>{formatCurrency(results.equiv_income)}</strong>
          </div>
        </div>

        <div className="results-divider" />

        <div className="seg" role="group" aria-label="Nivel de comparación">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewType(v)}
              className={`seg__btn ${viewType === v ? 'is-active' : ''}`}
              aria-pressed={viewType === v}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>

        <div className="chart-section">
          <ErrorBoundary label="DistributionChart">
            <DistributionChart
              viewType={viewType}
              userInput={userInput}
              results={results}
            />
          </ErrorBoundary>
        </div>
      </section>

      <section className="stats-section" aria-labelledby="stats-title">
        <h3 className="stats-title" id="stats-title">
          <i className="fas fa-chart-bar" aria-hidden="true"></i>
          <span>
            Así es <em>{municipalityName}</em>
          </span>
        </h3>
        <ErrorBoundary label="StatsCards">
          <StatsCards municipality={userInput.municipality} />
        </ErrorBoundary>
      </section>

      <div className="results-actions">
        <button
          type="button"
          onClick={onRecalculate}
          className="btn btn--secondary"
        >
          <i
            className="fas fa-rotate-left btn__icon"
            aria-hidden="true"
          ></i>
          Volver a calcular
        </button>
      </div>
    </div>
  )
}
