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
    <div className="stats-skeleton" aria-busy="true" aria-label="Cargando estadísticas">
      <div className="stat-card stat-card--skeleton" />
      <div className="stat-card stat-card--skeleton" />
      <div className="stat-card stat-card--skeleton" />
    </div>
  )
}

interface StatCardProps {
  variant: 'income' | 'education' | 'foreign'
  icon: string
  value: string
  label: string
}

function StatCard({ variant, icon, value, label }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${variant}`}>
      <span className="stat-card__icon" aria-hidden="true">
        <i className={`fas ${icon}`}></i>
      </span>
      <div className="stat-card__body">
        <h4 className="stat-card__value">{value}</h4>
        <p className="stat-card__label">{label}</p>
      </div>
    </article>
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
    return (
      <div className="field-message field-message--error" role="alert">
        Error: {error}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="field-message field-message--warning" role="status">
        No se encontraron datos para este municipio
      </div>
    )
  }

  const provincial = (flag: number | undefined) =>
    isImputed(flag) ? ', media provincial' : ''

  return (
    <div className="stat-cards">
      <StatCard
        variant="income"
        icon="fa-euro-sign"
        value={formatCurrency(stats.net_income_equiv)}
        label={`Ingreso medio equivalente (2024${provincial(stats.net_income_equiv_is_imputed)})`}
      />
      <StatCard
        variant="education"
        icon="fa-graduation-cap"
        value={formatPercentage(stats.pct_higher_ed_completed)}
        label={`Población de 15 y más años con estudios superiores (2023${provincial(stats.pct_higher_ed_completed_is_imputed)})`}
      />
      <StatCard
        variant="foreign"
        icon="fa-globe"
        value={formatPercentage(stats.pct_foreign_born)}
        label={`Población nacida en el extranjero (2024${provincial(stats.pct_foreign_born_is_imputed)})`}
      />
    </div>
  )
}
