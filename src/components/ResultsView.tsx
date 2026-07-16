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

const viewLabels: Record<ViewType, string> = {
  national: 'Nacional',
  provincial: 'Provincial',
  municipal: 'Municipal',
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

  const headline =
    displayPercentile <= 1
      ? `Tu hogar estuvo entre el 1% más pobre de ${placeName}`
      : `Tu hogar ingresó más que el ${displayPercentile}% de la población en ${placeName}`

  return (
    <div className="results-container">
      <div className="main-results-section">
        <div className="distribution-container">
          <div className="result-header">
            <div className="percentile-display">
              <span className="percentile-number">{animatedPercentile}</span>
              <span className="percentile-symbol">%</span>
            </div>
            <div className="result-text-block">
              <div className="result-eyebrow">En 2024</div>
              <div className="result-text">{headline}</div>
              <div className="result-meta">
                <i className="fas fa-coins"></i>
                Ingresos anuales equivalentes&nbsp;
                <strong>{formatCurrency(results.equiv_income)}</strong>
              </div>
            </div>
          </div>

          <div className="results-divider" />

          <div className="view-toggles">
            {(['national', 'provincial', 'municipal'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewType(v)}
                className={`nav-button ${viewType === v ? 'active' : ''}`}
              >
                {viewLabels[v]}
              </button>
            ))}
          </div>

          <div className="chart-controls-container">
            <div className="chart-container">
              <ErrorBoundary label="DistributionChart">
                <DistributionChart
                  viewType={viewType}
                  userInput={userInput}
                  results={results}
                />
              </ErrorBoundary>
            </div>
            <div className="stats-container">
              <div className="stats-title">
                <i className="fas fa-chart-bar"></i>
                <span>&nbsp;Estadísticas de {municipalityName}</span>
              </div>
              <ErrorBoundary label="StatsCards">
                <StatsCards municipality={userInput.municipality} />
              </ErrorBoundary>
            </div>
          </div>

          <div className="results-actions">
            <button onClick={onRecalculate} className="btn-recalculate">
              <i className="fas fa-rotate-left"></i>
              Volver a calcular
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
