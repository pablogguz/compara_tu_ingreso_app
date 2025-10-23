'use client'

import { useEffect, useState } from 'react'
import { loadMunicipalityStats } from '@/lib/dataLoader'
import { formatCurrency, formatPercentage } from '@/lib/calculations'

interface StatsCardsProps {
  municipality: string
}

export default function StatsCards({ municipality }: StatsCardsProps) {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadMunicipalityStats(municipality).then(setStats)
  }, [municipality])

  if (!stats) {
    return <div>Loading statistics...</div>
  }

  return (
    <div>
      {/* Income card */}
      <div className="small-box bg-success">
        <div className="inner">
          <h3>{formatCurrency(stats.net_income_equiv)}</h3>
          <p className="small-box-subtitle">
            Ingreso medio equivalente (2023
            {stats.net_income_equiv_is_imputed === 1
              ? ', media provincial'
              : ''}
            )
          </p>
        </div>
        <div className="icon">
          <i className="fas fa-euro-sign"></i>
        </div>
      </div>

      {/* Education card */}
      <div className="small-box bg-warning">
        <div className="inner">
          <h3>{formatPercentage(stats.pct_higher_ed_completed)}</h3>
          <p className="small-box-subtitle">
            Población de 15 y más años con estudios superiores (2023
            {stats.pct_higher_ed_completed_is_imputed === 1
              ? ', media provincial'
              : ''}
            )
          </p>
        </div>
        <div className="icon">
          <i className="fas fa-graduation-cap"></i>
        </div>
      </div>

      {/* Foreign-born card */}
      <div className="small-box bg-primary">
        <div className="inner">
          <h3>{formatPercentage(stats.pct_foreign_born)}</h3>
          <p className="small-box-subtitle">
            Población nacida en el extranjero (2024
            {stats.pct_foreign_born_is_imputed === 1 ? ', media provincial' : ''}
            )
          </p>
        </div>
        <div className="icon">
          <i className="fas fa-globe"></i>
        </div>
      </div>
    </div>
  )
}
