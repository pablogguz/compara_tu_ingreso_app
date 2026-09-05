'use client'

import { useEffect, useMemo, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import type { UserInput, CalculatedResults, ViewType } from '@/types'
import {
  loadNationalDensity,
  loadProvincialDensity,
  loadMunicipalDensity,
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
} from '@/lib/dataLoader'
import { findValueForPercentile } from '@/lib/calculations'
import { buildDistributionOptions } from '@/lib/charts/distributionOptions'

interface DistributionChartProps {
  viewType: ViewType
  userInput: UserInput
  results: CalculatedResults
}

interface ChartData {
  density: Array<{ x: number; y: number }>
  percentiles: number[]
}

async function loadDataForView(
  viewType: ViewType,
  userInput: UserInput,
  results: CalculatedResults
): Promise<ChartData> {
  if (viewType === 'national') {
    const [density, percentiles] = await Promise.all([
      loadNationalDensity(),
      loadNationalPercentiles(),
    ])
    return { density, percentiles }
  }
  if (viewType === 'provincial') {
    const [density, percentiles] = await Promise.all([
      loadProvincialDensity(results.selected_prov),
      loadProvincialPercentiles(results.selected_prov),
    ])
    return { density, percentiles }
  }
  const [density, percentiles] = await Promise.all([
    loadMunicipalDensity(userInput.municipality, results.selected_prov),
    loadMunicipalPercentiles(userInput.municipality),
  ])
  return { density, percentiles }
}

// Hoisted: HighchartsReact re-runs chart.update() whenever this prop's
// identity changes, and ResultsView re-renders on every count-up frame.
const CONTAINER_PROPS = { className: 'chart-canvas' }

function ChartSkeleton() {
  return <div className="chart-skeleton" aria-busy="true" aria-label="Cargando gráfico" />
}

export default function DistributionChart({
  viewType,
  userInput,
  results,
}: DistributionChartProps) {
  const [data, setData] = useState<ChartData | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDataForView(viewType, userInput, results)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => console.error('Chart data load failed:', err))
    return () => {
      cancelled = true
    }
  }, [viewType, userInput, results])

  const options = useMemo(() => {
    if (!data) return null
    const p99 = findValueForPercentile(99, data.percentiles)
    const userIncome = results.equiv_income
    const userValueOnAxis = userIncome > p99 ? p99 - 0.01 * p99 : userIncome
    const predictedValue = findValueForPercentile(
      userInput.perceivedPercentile,
      data.percentiles
    )
    const currentPercentile =
      viewType === 'national'
        ? results.national_percentile
        : viewType === 'provincial'
          ? results.provincial_percentile
          : results.municipal_percentile

    return buildDistributionOptions({
      viewType,
      density: data.density,
      p99,
      userValueOnAxis,
      predictedValue,
      currentPercentile,
      perceivedPercentile: userInput.perceivedPercentile,
    })
  }, [data, viewType, userInput, results])

  if (!options) return <ChartSkeleton />

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
      containerProps={CONTAINER_PROPS}
    />
  )
}
