'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UserInput, CalculatedResults, ViewType } from '@/types'
import { useMunicipalities, findMunicipality } from '@/lib/DataContext'
import { loadNationalDensity, loadMunicipalityStats } from '@/lib/dataLoader'
import { formatCurrency } from '@/lib/calculations'
import { useCountUp } from '@/hooks/useCountUp'
import { useRevealSequence, hasReached } from '@/hooks/useRevealSequence'
import DistributionChart from './DistributionChart'
import StatsCards from './StatsCards'
import { ErrorBoundary } from './ErrorBoundary'

interface ResultsViewProps {
  userInput: UserInput
  results: CalculatedResults
  onRecalculate: () => void
}

const VIEWS: ViewType[] = ['national', 'provincial', 'municipal']

// Intro timeline (ms after mount). The CSS side lives on .results-hero in
// public/css/styles_results.css: --t-count-start / --t-land must equal
// countDelay / countDelay + countDuration. The chart mounts once the hero's
// cascade (headline, pill, divider, toggle) has played out; the stats row
// follows while the curve is drawing.
export const REVEAL = {
  countDelay: 150,
  countDuration: 1400,
  countUpdateDuration: 700,
  chart: 2150,
  stats: 2700,
  done: 4400,
} as const

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
  // Bumped on every view change so the wording can crossfade via `key`.
  // Stays 0 through the intro so the first render never gets the swap class.
  const [swapKey, setSwapKey] = useState(0)
  const { municipalities } = useMunicipalities()
  const act = useRevealSequence(REVEAL)
  const showChart = hasReached(act, 'chart')
  const showStats = hasReached(act, 'stats')

  // Warm the caches while the hero plays so the chart and the stats cards
  // mount with their data already in memory (no skeleton flash mid-reveal).
  useEffect(() => {
    void loadNationalDensity().catch(() => {})
    void loadMunicipalityStats(userInput.municipality).catch(() => {})
  }, [userInput.municipality])

  const selectView = (v: ViewType) => {
    if (v === viewType) return
    setViewType(v)
    setSwapKey((k) => k + 1)
  }

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
  const animatedPercentile = useCountUp(displayPercentile, REVEAL.countDuration, {
    delay: REVEAL.countDelay,
    updateDuration: REVEAL.countUpdateDuration,
  })
  const landed = animatedPercentile === displayPercentile

  const placeName =
    viewType === 'national'
      ? 'España'
      : viewType === 'provincial'
        ? provinceName
        : municipalityName

  const headline = buildHeadline(displayPercentile, placeName)

  return (
    <div className="results-container">
      <section
        className={`results-hero ${landed ? 'is-landed' : ''}`}
        aria-labelledby="results-headline"
      >
        <div className="result-header">
          <div className="result-eyebrow">
            Tu hogar en 2024 ·{' '}
            <strong
              key={swapKey}
              className={`result-eyebrow__place ${swapKey ? 'result-eyebrow__place--swap' : ''}`}
            >
              {placeName}
            </strong>
          </div>
          <div className="percentile-display" aria-hidden="true">
            <span className="percentile-number">{animatedPercentile}</span>
            <span className="percentile-symbol">%</span>
          </div>
          <div className="result-text-wrap">
            <h2
              key={swapKey}
              className={`result-text ${swapKey ? 'result-text--swap' : ''}`}
              id="results-headline"
            >
              {headline}
            </h2>
          </div>
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
              onClick={() => selectView(v)}
              className={`seg__btn ${viewType === v ? 'is-active' : ''}`}
              aria-pressed={viewType === v}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>

        <div className="chart-section" aria-busy={!showChart}>
          {showChart && (
            <ErrorBoundary label="DistributionChart">
              <DistributionChart
                viewType={viewType}
                userInput={userInput}
                results={results}
              />
            </ErrorBoundary>
          )}
        </div>
      </section>

      {showStats && (
        <aside className="results-aside">
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
              className="btn btn--secondary btn--sm"
            >
              <i
                className="fas fa-rotate-left btn__icon"
                aria-hidden="true"
              ></i>
              Volver a calcular
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
