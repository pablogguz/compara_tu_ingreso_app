'use client'

import { useState, useEffect } from 'react'
import { UserInput, CalculatedResults, ViewType } from '@/types'
import DistributionChart from './DistributionChart'
import StatsCards from './StatsCards'

interface ResultsViewProps {
  userInput: UserInput
  results: CalculatedResults
}

export default function ResultsView({ userInput, results }: ResultsViewProps) {
  const [viewType, setViewType] = useState<ViewType>('national')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const currentPercentile =
    viewType === 'national'
      ? results.national_percentile
      : viewType === 'provincial'
      ? results.provincial_percentile
      : results.municipal_percentile

  const displayPercentile = Math.min(99, currentPercentile)

  return (
    <div className="results-container">
      <div className="main-results-section">
        {/* Hero section */}
        <div className={`results-hero ${isVisible ? 'visible' : ''}`}>
          <div className="hero-content">
            <div className="result-header">
              <div className="percentile-display">
                <span className="percentile-number">{displayPercentile}</span>
                <span className="percentile-symbol">%</span>
              </div>
              <div className="result-text">
                {displayPercentile <= 1
                  ? `En 2023, tu hogar estuvo entre el 1% más pobre de ${
                      viewType === 'national'
                        ? 'España'
                        : viewType === 'provincial'
                        ? 'tu provincia'
                        : 'tu municipio'
                    }`
                  : `En 2023, tu hogar ingresó más que el ${displayPercentile}% de la población en ${
                      viewType === 'national'
                        ? 'España'
                        : viewType === 'provincial'
                        ? 'tu provincia'
                        : 'tu municipio'
                    }`}
              </div>
            </div>
          </div>
        </div>

        {/* Distribution section */}
        <div className={`distribution-container ${isVisible ? 'visible' : ''}`}>
          {/* View toggles */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => setViewType('national')}
              className={`nav-button ${viewType === 'national' ? 'active' : ''}`}
            >
              Nacional
            </button>
            <button
              onClick={() => setViewType('provincial')}
              className={`nav-button ${
                viewType === 'provincial' ? 'active' : ''
              }`}
            >
              Provincial
            </button>
            <button
              onClick={() => setViewType('municipal')}
              className={`nav-button ${viewType === 'municipal' ? 'active' : ''}`}
            >
              Municipal
            </button>
          </div>

          {/* Chart and stats */}
          <div className="chart-controls-container">
            <div className="chart-container">
              <DistributionChart
                viewType={viewType}
                userInput={userInput}
                results={results}
              />
            </div>
            <div className={`stats-container ${isVisible ? 'visible' : ''}`}>
              <div className="stats-title">
                <i className="fas fa-chart-bar"></i>
                <span> Estadísticas de tu municipio</span>
              </div>
              <StatsCards municipality={userInput.municipality} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
