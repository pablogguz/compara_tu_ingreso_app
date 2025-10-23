'use client'

import { useEffect, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { UserInput, CalculatedResults, ViewType } from '@/types'
import {
  loadNationalDensity,
  loadProvincialDensity,
  loadMunicipalDensity,
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
  loadMunicipalityLookup,
} from '@/lib/dataLoader'
import { findValueForPercentile } from '@/lib/calculations'

interface DistributionChartProps {
  viewType: ViewType
  userInput: UserInput
  results: CalculatedResults
}

export default function DistributionChart({
  viewType,
  userInput,
  results,
}: DistributionChartProps) {
  const [chartOptions, setChartOptions] = useState<Highcharts.Options | null>(
    null
  )

  useEffect(() => {
    loadChartData()
  }, [viewType, userInput, results])

  const loadChartData = async () => {
    try {
      // Load municipality lookup
      const munData = await loadMunicipalityLookup()
      const selectedMun = munData.find((m) => m.mun_code === userInput.municipality)
      if (!selectedMun) return

      // Load density data based on view type
      let densityData: Array<{ x: number; y: number }> = []
      let percentiles: number[] = []

      if (viewType === 'national') {
        densityData = await loadNationalDensity()
        percentiles = await loadNationalPercentiles()
      } else if (viewType === 'provincial') {
        densityData = await loadProvincialDensity(results.selected_prov)
        percentiles = await loadProvincialPercentiles(results.selected_prov)
      } else {
        densityData = await loadMunicipalDensity(
          userInput.municipality,
          results.selected_prov
        )
        percentiles = await loadMunicipalPercentiles(userInput.municipality)
      }

      // Get p99 for x-axis limit
      const p99 = findValueForPercentile(99, percentiles)

      // Get current percentile
      const currentPercentile =
        viewType === 'national'
          ? results.national_percentile
          : viewType === 'provincial'
          ? results.provincial_percentile
          : results.municipal_percentile

      // Calculate x position for user's income
      const userIncome = results.equiv_income
      const xAxis = userIncome > p99 ? p99 - 0.01 * p99 : userIncome

      // Format series data
      const seriesData = densityData.map((d) => [d.x, d.y])

      // Create series array
      const series: Highcharts.SeriesOptionsType[] = [
        {
          type: 'area',
          name:
            viewType === 'national'
              ? 'Distribución nacional'
              : viewType === 'provincial'
              ? 'Distribución provincial'
              : 'Distribución municipal',
          data: seriesData,
          color: '#58a2ec',
          fillOpacity: 0.3,
        },
        {
          type: 'line',
          name: 'Tu posición',
          data: [
            [xAxis, 0],
            [xAxis, Math.max(...densityData.map((d) => d.y)) * 1.15],
          ],
          color: '#155494',
          dashStyle: 'Dash',
          lineWidth: 2,
          marker: { enabled: false },
        },
      ]

      // Add prediction line only for national view
      if (viewType === 'national') {
        const predictedX = findValueForPercentile(
          userInput.perceivedPercentile,
          percentiles
        )
        series.push({
          type: 'line',
          name: 'Tu predicción',
          data: [
            [predictedX, 0],
            [predictedX, Math.max(...densityData.map((d) => d.y)) * 1.15],
          ],
          color: '#e74c3c',
          dashStyle: 'Dash',
          lineWidth: 2,
          marker: { enabled: false },
        })
      }

      // Build chart options
      const options: Highcharts.Options = {
        chart: {
          style: {
            fontFamily: 'Inter, sans-serif',
          },
        },
        title: { text: '' },
        xAxis: {
          min: 0,
          max: p99,
          title: {
            text: 'Ingresos anuales equivalentes',
            style: { fontSize: '16px' },
          },
          labels: {
            formatter: function () {
              return (
                Math.round(this.value as number).toLocaleString('es-ES') + ' €'
              )
            },
            style: { fontSize: '14px' },
          },
        },
        yAxis: {
          title: { text: '' },
          labels: { enabled: false },
          gridLineWidth: 0,
        },
        legend: {
          align: 'left',
          verticalAlign: 'top',
          layout: 'horizontal',
        },
        tooltip: {
          enabled: false,
        },
        series,
        credits: { enabled: false },
      }

      setChartOptions(options)
    } catch (error) {
      console.error('Error loading chart data:', error)
    }
  }

  if (!chartOptions) {
    return <div>Loading chart...</div>
  }

  return (
    <HighchartsReact highcharts={Highcharts} options={chartOptions} />
  )
}
