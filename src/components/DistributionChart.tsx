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
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(88, 162, 236, 0.8)'],
              [1, 'rgba(88, 162, 236, 0.1)']
            ]
          },
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(88, 162, 236, 0.5)'],
              [1, 'rgba(88, 162, 236, 0.05)']
            ]
          },
          lineWidth: 3,
          enableMouseTracking: false,
          marker: {
            enabled: false
          },
          states: {
            hover: {
              lineWidth: 3
            }
          }
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
          lineWidth: 3,
          marker: { 
            enabled: true,
            radius: 6,
            fillColor: '#155494',
            lineWidth: 3,
            lineColor: '#ffffff',
            symbol: 'circle',
            states: {
              hover: {
                radius: 8,
                lineWidth: 3
              }
            }
          },
          enableMouseTracking: true,
          stickyTracking: false,
          tooltip: {
            headerFormat: '',
            pointFormat: `<b>Tu posición</b><br/>Percentil: ${Math.round(currentPercentile)}%<br/>Ingresos: {point.x:,.0f} €`,
          },
          zIndex: 5,
          shadow: {
            color: 'rgba(21, 84, 148, 0.3)',
            width: 5,
            offsetX: 0,
            offsetY: 0
          }
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
        lineWidth: 3,
        marker: { 
          enabled: true,
          radius: 6,
          fillColor: '#e74c3c',
          lineWidth: 3,
          lineColor: '#ffffff',
          symbol: 'circle',
          states: {
            hover: {
              radius: 8,
              lineWidth: 3
            }
          }
        },
        enableMouseTracking: viewType === 'national',
        stickyTracking: false,
        visible: viewType === 'national', // This is the key!
        showInLegend: viewType === 'national', // Hide from legend too
        tooltip: {
          headerFormat: '',
          pointFormat: `<b>Tu predicción</b><br/>Percentil nacional: ${userInput.perceivedPercentile}%<br/>Ingresos: {point.x:,.0f} €`,
        },
        zIndex: 5,
        shadow: {
          color: 'rgba(231, 76, 60, 0.3)',
          width: 5,
          offsetX: 0,
          offsetY: 0
        }
      })

      // Build chart options
      const options: Highcharts.Options = {
        chart: {
          style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          animation: {
            duration: 1200,
            easing: 'easeInOutQuad',
          },
          backgroundColor: 'transparent',
          spacing: [20, 20, 20, 20],
        },
        title: { text: '' },
        xAxis: {
          min: 0,
          max: p99,
          title: {
            text: 'Ingresos anuales equivalentes',
            style: {
              fontSize: '16px',
              fontWeight: '600',
              color: '#334155',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
            margin: 15,
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
              fontSize: '13px',
              color: '#64748b',
              fontWeight: '500',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          },
          lineColor: '#e2e8f0',
          lineWidth: 2,
          tickColor: '#e2e8f0',
          tickWidth: 2,
          softMin: 0,
          softMax: p99,
        },
        yAxis: {
          title: { text: '' },
          labels: { enabled: false },
          gridLineWidth: 0,
          softMin: 0,
          lineWidth: 0,
        },
        legend: {
          align: 'left',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            fontWeight: '600',
            color: '#334155',
          },
          itemHoverStyle: {
            color: '#58a2ec'
          },
          itemMarginBottom: 10,
          symbolRadius: 6,
          symbolHeight: 12,
          symbolWidth: 12,
          symbolPadding: 8,
        },
        tooltip: {
          enabled: true,
          shared: false,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#e2e8f0',
          borderWidth: 2,
          borderRadius: 12,
          shadow: {
            color: 'rgba(0, 0, 0, 0.1)',
            width: 8,
            offsetX: 0,
            offsetY: 4
          },
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#334155',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          padding: 12,
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
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(88, 162, 236, 0.8)'],
              [1, 'rgba(88, 162, 236, 0.1)']
            ]
          },
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(88, 162, 236, 0.5)'],
              [1, 'rgba(88, 162, 236, 0.05)']
            ]
          },
          lineWidth: 3,
          enableMouseTracking: false,
        }, false) // false = don't redraw yet

        // Update x-axis if needed
        chartInstance.xAxis[0].update({
          max: p99,
        }, false)

        // Update 'Tu posición' (position + tooltip percentile for current tab)
        const userLineMaxY = Math.max(...densityData.map((d) => d.y)) * 1.15
        chartInstance.series[1]?.update({
          type: 'line',
          data: [
            [xAxis, 0],
            [xAxis, userLineMaxY],
          ],
          lineWidth: 3,
          marker: { 
            enabled: true,
            radius: 6,
            fillColor: '#155494',
            lineWidth: 3,
            lineColor: '#ffffff',
          },
          tooltip: {
            headerFormat: '',
            pointFormat: `<b>Tu posición</b><br/>Percentil: ${Math.round(currentPercentile)}%<br/>Ingresos: {point.x:,.0f} €`,
          },
        }, false)

        // Add/remove 'Tu predicción' depending on tab
        const predSeries = chartInstance.series.find(s => s.name === 'Tu predicción')
        if (viewType === 'national') {
          const predData = [
            [predictedX, 0],
            [predictedX, userLineMaxY],
          ]
          if (predSeries) {
            predSeries.update({ 
              type: 'line', 
              data: predData, 
              visible: true, 
              showInLegend: true,
              lineWidth: 3,
              marker: { 
                enabled: true,
                radius: 6,
                fillColor: '#e74c3c',
                lineWidth: 3,
                lineColor: '#ffffff',
              }
            }, false)
          } else {
            chartInstance.addSeries({
              type: 'line',
              name: 'Tu predicción',
              data: predData,
              color: '#e74c3c',
              dashStyle: 'Dash',
              lineWidth: 3,
              marker: { 
                enabled: true,
                radius: 6,
                fillColor: '#e74c3c',
                lineWidth: 3,
                lineColor: '#ffffff',
              },
              enableMouseTracking: true,
              stickyTracking: false,
              zIndex: 5,
              shadow: {
                color: 'rgba(231, 76, 60, 0.3)',
                width: 5,
                offsetX: 0,
                offsetY: 0
              },
              tooltip: {
                headerFormat: '',
                pointFormat: `<b>Tu predicción</b><br/>Percentil nacional: ${userInput.perceivedPercentile}%<br/>Ingresos: {point.x:,.0f} €`,
              },
            }, false)
          }
        } else if (predSeries) {
          // Remove it entirely on provincial/municipal
          predSeries.remove(false)
        }


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
