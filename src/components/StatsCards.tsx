'use client'

import { useEffect, useState } from 'react'
import { loadMunicipalityStats, loadMunicipalityLookup } from '@/lib/dataLoader'
import { formatCurrency, formatPercentage } from '@/lib/calculations'

interface StatsCardsProps {
  municipality: string
  onMunicipalityNameLoaded?: (name: string) => void
  onProvinceNameLoaded?: (name: string) => void
}

export default function StatsCards({ municipality, onMunicipalityNameLoaded, onProvinceNameLoaded }: StatsCardsProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('StatsCards: Loading stats for municipality:', municipality)
    setLoading(true)
    setError(null)
    
    Promise.all([
      loadMunicipalityStats(municipality),
      loadMunicipalityLookup()
    ])
      .then(([statsData, lookupData]) => {
        console.log('StatsCards: Loaded stats:', statsData)
        setStats(statsData)
        
        // Find and pass municipality and province names to parent
        const munData = lookupData.find(m => m.mun_code === municipality)
        if (munData) {
          if (onMunicipalityNameLoaded) {
            onMunicipalityNameLoaded(munData.mun_name)
          }
          if (onProvinceNameLoaded) {
            onProvinceNameLoaded(munData.prov_name)
          }
        }
        
        setLoading(false)
      })
      .catch((err) => {
        console.error('StatsCards: Error loading stats:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [municipality, onMunicipalityNameLoaded, onProvinceNameLoaded])

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        Cargando estadísticas...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>
        Error: {error}
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ padding: '1rem', color: '#f59e0b', fontSize: '0.875rem' }}>
        No se encontraron datos para este municipio
      </div>
    )
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
