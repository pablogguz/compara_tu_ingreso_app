'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { loadMunicipalityLookup } from './dataLoader'
import type { Municipality } from '@/types'

interface DataContextValue {
  municipalities: Municipality[]
  loading: boolean
  error: Error | null
}

const DataContext = createContext<DataContextValue | null>(null)

const FALLBACK_MUNICIPALITIES: Municipality[] = [
  { mun_code: '28005', mun_name: 'Aranjuez', prov_code: '28', prov_name: 'Madrid' },
  { mun_code: '08019', mun_name: 'Barcelona', prov_code: '08', prov_name: 'Barcelona' },
  { mun_code: '28079', mun_name: 'Madrid', prov_code: '28', prov_name: 'Madrid' },
  { mun_code: '41091', mun_name: 'Sevilla', prov_code: '41', prov_name: 'Sevilla' },
  { mun_code: '46250', mun_name: 'Valencia', prov_code: '46', prov_name: 'Valencia' },
  { mun_code: '29067', mun_name: 'Málaga', prov_code: '29', prov_name: 'Málaga' },
  { mun_code: '48020', mun_name: 'Bilbao', prov_code: '48', prov_name: 'Vizcaya' },
]

// Single fetch site for municipality_lookup. Without this, QuestionFlow,
// ResultsView, StatsCards and DistributionChart each load the same arrow file
// independently — the in-memory cache in dataLoader still dedupes responses,
// but four parallel requests fire on first paint.
export function DataProvider({ children }: { children: ReactNode }) {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    loadMunicipalityLookup()
      .then((data) => {
        if (!cancelled) {
          setMunicipalities(data)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error('Failed to load municipalities, using fallback:', err)
          setMunicipalities(FALLBACK_MUNICIPALITIES)
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DataContext.Provider value={{ municipalities, loading, error }}>
      {children}
    </DataContext.Provider>
  )
}

export function useMunicipalities(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx)
    throw new Error('useMunicipalities must be used within <DataProvider>')
  return ctx
}

export function findMunicipality(
  list: Municipality[],
  code: string
): Municipality | undefined {
  return list.find((m) => m.mun_code === code)
}
