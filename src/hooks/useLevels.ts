'use client'

import { useEffect, useState } from 'react'
import type { CalculatedResults, MunicipalityStats } from '@/types'
import {
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
  loadNationalDensity,
  loadProvincialDensity,
  loadMunicipalDensity,
  loadMunicipalityStats,
} from '@/lib/dataLoader'
import { findValueForPercentile } from '@/lib/calculations'
import { useMunicipalities, findMunicipality } from '@/lib/DataContext'
import { displayPercentile, naturalName } from '@/lib/format'

export type LevelKey = 'national' | 'provincial' | 'municipal'

export interface Landmark {
  /** 10, 25, 50, 75, 90, 99 */
  p: number
  /** income per consumption unit at that percentile */
  value: number
  /** "P10" … "Mediana" … "P99" */
  label: string
}

export interface Level {
  key: LevelKey
  /** "España" | "Provincia de Madrid" | "Madrid" */
  label: string
  /** the place name alone, for sentences: "España" | "Madrid" | "Las Rozas de Madrid" */
  place: string
  /** 1…99, what to show */
  percentile: number
  /** the raw lookup (1…100) */
  rawPercentile: number
  /** 99 values: income at percentiles 1…99 */
  percentiles: number[]
  /** density curve, { x: income, y: density }, 1,000 points up to 160.000 € */
  density: Array<{ x: number; y: number }>
  median: number
  p99: number
  landmarks: Landmark[]
}

export type Stats = Omit<MunicipalityStats, 'mun_code'>

export interface LevelsData {
  loading: boolean
  error: string | null
  /** always national, provincial, municipal — in that order */
  levels: Level[]
  /** municipality figures; null when there are none */
  stats: Stats | null
  /** income at the percentile the user guessed, on the national distribution */
  guessValue: number | null
}

const LANDMARKS: Array<[number, string]> = [
  [10, 'P10'],
  [25, 'P25'],
  [50, 'Mediana'],
  [75, 'P75'],
  [90, 'P90'],
  [99, 'P99'],
]

// Everything a results screen needs for the three levels: percentiles,
// density curves, landmark incomes and the municipality's figures. The files
// are cached by dataLoader, so this is instant after the calculation.
export function useLevels(
  results: CalculatedResults | null,
  municipalityCode: string,
  perceivedPercentile: number
): LevelsData {
  const { municipalities } = useMunicipalities()
  const [state, setState] = useState<LevelsData>({
    loading: true,
    error: null,
    levels: [],
    stats: null,
    guessValue: null,
  })

  useEffect(() => {
    if (!results) return
    let cancelled = false
    const m = findMunicipality(municipalities, municipalityCode)
    const prov = results.selected_prov

    Promise.all([
      loadNationalPercentiles(),
      loadProvincialPercentiles(prov),
      loadMunicipalPercentiles(municipalityCode),
      loadNationalDensity(),
      loadProvincialDensity(prov),
      loadMunicipalDensity(municipalityCode, prov),
      loadMunicipalityStats(municipalityCode).catch(() => null),
    ])
      .then(([np, pp, mp, nd, pd, md, stats]) => {
        if (cancelled) return
        const make = (
          key: LevelKey,
          label: string,
          place: string,
          raw: number,
          percentiles: number[],
          density: Array<{ x: number; y: number }>
        ): Level => ({
          key,
          label,
          place,
          rawPercentile: raw,
          percentile: displayPercentile(raw),
          percentiles,
          density,
          median: percentiles[49],
          p99: percentiles[98],
          landmarks: LANDMARKS.map(([p, l]) => ({ p, label: l, value: percentiles[p - 1] })),
        })
        const provName = m ? naturalName(m.prov_name) : 'tu provincia'
        const munName = m ? naturalName(m.mun_name) : 'tu municipio'
        setState({
          loading: false,
          error: null,
          levels: [
            make('national', 'España', 'España', results.national_percentile, np, nd),
            make('provincial', `Provincia de ${provName}`, provName, results.provincial_percentile, pp, pd),
            make('municipal', munName, munName, results.municipal_percentile, mp, md),
          ],
          stats: (stats as Stats | null) ?? null,
          guessValue: findValueForPercentile(perceivedPercentile, np),
        })
      })
      .catch((e: Error) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e.message }))
      })
    return () => {
      cancelled = true
    }
  }, [results, municipalityCode, perceivedPercentile, municipalities])

  return state
}
