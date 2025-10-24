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
  const [chartInstance, setChartInstance] = useState<Highcharts.Chart | null>(
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
          fillOpacity: 0.2,
          enableMouseTracking: false,
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
          enableMouseTracking: true,
          stickyTracking: false,
          tooltip: {
            headerFormat: '',
            pointFormat: `<b>Tu posición</b><br/>Percentil: ${Math.round(currentPercentile)}%<br/>Ingresos: {point.x:,.0f} €`,
          },
        },
      ]

      // Add prediction line only for national view
      // Add prediction line for all views, but only show in national
      const predictedX = findValueForPercentile(
        userInput.perceivedPercentile,
        percentiles
      )
      series.push({
        type: 'line',
        name: 'Tu predicción',
        data: viewType === 'national'
          ? [
            [predictedX, 0],
            [predictedX, Math.max(...densityData.map((d) => d.y)) * 1.15],
          ]
          : [], // Empty data when not national
        color: '#e74c3c',
        dashStyle: 'Dash',
        lineWidth: 2,
        marker: { enabled: false },
        enableMouseTracking: viewType === 'national',
        stickyTracking: false,
        visible: viewType === 'national', // This is the key!
        showInLegend: viewType === 'national', // Hide from legend too
        tooltip: {
          headerFormat: '',
          pointFormat: `<b>Tu predicción</b><br/>Percentil: ${userInput.perceivedPercentile}%<br/>Ingresos: {point.x:,.0f} €`,
        },
      })

      // Build chart options
      const options: Highcharts.Options = {
        chart: {
          style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          animation: {
            duration: 800,
            easing: 'easeInOutQuad',
          },
        },
        title: { text: '' },
        xAxis: {
          min: 0,
          max: p99,
          title: {
            text: 'Ingresos anuales equivalentes',
            style: {
              fontSize: '16px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          },
          labels: {
            formatter: function () {
              const value = this.value as number;
              if (value >= 1000) {
                return Math.round(value / 1000) + 'k €';
              }
              return Math.round(value) + ' €';
            },
            style: {
              fontSize: '14px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          },
          softMin: 0,
          softMax: p99,
        },
        yAxis: {
          title: { text: '' },
          labels: { enabled: false },
          gridLineWidth: 0,
          softMin: 0,
        },
        legend: {
          align: 'left',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
          },
        },
        tooltip: {
          enabled: true,
          shared: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#ccc',
          borderRadius: 8,
          style: {
            fontSize: '14px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          useHTML: false,
        },
        plotOptions: {
          series: {
            animation: {
              duration: 800,
              easing: 'easeInOutQuad',
            },
          },
          area: {
            animation: {
              duration: 800,
              easing: 'easeInOutQuad',
            },
          },
          line: {
            animation: {
              duration: 800,
              easing: 'easeInOutQuad',
            },
          },
        },
        series,
        credits: { enabled: false },
      }

      // Update chart with animation if it exists, otherwise set options
      if (chartInstance) {
        // Only update the distribution area series (first series)
        // This keeps the vertical lines static while redrawing the distribution
        chartInstance.series[0].update({
          type: 'area',
          name:
            viewType === 'national'
              ? 'Distribución nacional'
              : viewType === 'provincial'
                ? 'Distribución provincial'
                : 'Distribución municipal',
          data: seriesData,
          color: '#58a2ec',
          fillOpacity: 0.2,
          enableMouseTracking: false,
        }, false) // false = don't redraw yet
        
        // Update x-axis if needed
        chartInstance.xAxis[0].update({
          max: p99,
        }, false)
        
        // Now redraw with animation
        chartInstance.redraw({
          duration: 800,
          easing: 'easeInOutQuad'
        })
      } else {
        setChartOptions(options)
      }
    } catch (error) {
      console.error('Error loading chart data:', error)
    }
  }

  if (!chartOptions) {
    return <div>Loading chart...</div>
  }

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={chartOptions}
      callback={(chart: Highcharts.Chart) => setChartInstance(chart)}
    />
  )
}
