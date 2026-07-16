'use client'

import { useEffect, useState } from 'react'
import { loadMunicipalityStats } from '@/lib/dataLoader'
import { formatCurrency, formatPercentage } from '@/lib/calculations'
import type { MunicipalityStats } from '@/types'

interface StatsCardsProps {
  municipality: string
}

type Stats = Omit<MunicipalityStats, 'mun_code'> | null

function isImputed(flag: number | undefined): boolean {
  return flag === 1
}

function StatsSkeleton() {
  return (
    <div className="stats-skeleton">
      <div className="stat-card stat-card--skeleton" />
      <div className="stat-card stat-card--skeleton" />
      <div className="stat-card stat-card--skeleton" />
    </div>
  )
}

export default function StatsCards({ municipality }: StatsCardsProps) {
  const [stats, setStats] = useState<Stats>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loadMunicipalityStats(municipality)
      .then((data) => {
        if (cancelled) return
        setStats(data as Stats)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [municipality])

  if (loading) return <StatsSkeleton />

  if (error) {
    return <div className="field-message field-message--error">Error: {error}</div>
  }

  if (!stats) {
    return (
      <div className="field-message field-message--warning">
        No se encontraron datos para este municipio
      </div>
    )
  }

  return (
    <div className="stat-cards">
      <article className="stat-card stat-card--income">
        <header className="stat-card__header">
          <i className="fas fa-euro-sign stat-card__icon" aria-hidden="true"></i>
          <h3 className="stat-card__value">
            {formatCurrency(stats.net_income_equiv)}
          </h3>
        </header>
        <p className="stat-card__label">
          Ingreso medio equivalente (2024
          {isImputed(stats.net_income_equiv_is_imputed) ? ', media provincial' : ''})
        </p>
      </article>

      <article className="stat-card stat-card--education">
        <header className="stat-card__header">
          <i className="fas fa-graduation-cap stat-card__icon" aria-hidden="true"></i>
          <h3 className="stat-card__value">
            {formatPercentage(stats.pct_higher_ed_completed)}
          </h3>
        </header>
        <p className="stat-card__label">
          Población de 15 y más años con estudios superiores (2023
          {isImputed(stats.pct_higher_ed_completed_is_imputed)
            ? ', media provincial'
            : ''}
          )
        </p>
      </article>

      <article className="stat-card stat-card--foreign">
        <header className="stat-card__header">
          <i className="fas fa-globe stat-card__icon" aria-hidden="true"></i>
          <h3 className="stat-card__value">
            {formatPercentage(stats.pct_foreign_born)}
          </h3>
        </header>
        <p className="stat-card__label">
          Población nacida en el extranjero (2024
          {isImputed(stats.pct_foreign_born_is_imputed)
            ? ', media provincial'
            : ''}
          )
        </p>
      </article>
    </div>
  )
}
