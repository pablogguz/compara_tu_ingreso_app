import type Highcharts from 'highcharts'
import type { ViewType } from '@/types'
import { chartTheme as t, resolveChartFont } from './theme'
import { formatAxisEuros, formatEuros } from './formatters'

export interface DistributionOptionsInput {
  viewType: ViewType
  density: Array<{ x: number; y: number }>
  p99: number
  userValueOnAxis: number
  predictedValue: number
  currentPercentile: number
  perceivedPercentile: number
}

const seriesNameByView: Record<ViewType, string> = {
  national: 'Distribución nacional',
  provincial: 'Distribución provincial',
  municipal: 'Distribución municipal',
}

export function buildDistributionOptions(
  input: DistributionOptionsInput
): Highcharts.Options {
  const {
    viewType,
    density,
    p99,
    userValueOnAxis,
    predictedValue,
    currentPercentile,
    perceivedPercentile,
  } = input

  const fontFamily = resolveChartFont()

  const labelStyle = {
    fontFamily,
    fontSize: '12px',
    fontWeight: '500',
    color: t.textMuted,
  }

  const titleStyle = {
    fontFamily,
    fontSize: '13px',
    fontWeight: '600',
    color: t.text,
  }

  const yMax = Math.max(...density.map((d) => d.y)) * 1.15
  const seriesData = density.map((d) => [d.x, d.y])

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'area',
      name: seriesNameByView[viewType],
      data: seriesData,
      color: t.areaLine,
      lineWidth: 2,
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, t.areaTop],
          [1, t.areaBottom],
        ],
      },
      enableMouseTracking: false,
      marker: { enabled: false },
      states: { hover: { lineWidth: 2 } },
    },
    {
      type: 'line',
      name: 'Tu posición',
      data: [
        [userValueOnAxis, 0],
        [userValueOnAxis, yMax],
      ],
      color: t.primaryDeep,
      dashStyle: 'ShortDash',
      lineWidth: 2.5,
      marker: {
        enabled: true,
        radius: 6,
        fillColor: t.primaryDeep,
        lineWidth: 2,
        lineColor: '#ffffff',
        symbol: 'circle',
        states: { hover: { radius: 8, lineWidth: 2 } },
      },
      enableMouseTracking: true,
      stickyTracking: false,
      tooltip: {
        headerFormat: '',
        pointFormat: `<b>Tu posición</b><br/>Percentil: ${Math.round(
          currentPercentile
        )}%<br/>Ingresos: {point.x:,.0f} €`,
      },
      zIndex: 5,
    },
    {
      type: 'line',
      name: 'Tu predicción',
      data:
        viewType === 'national'
          ? [
              [predictedValue, 0],
              [predictedValue, yMax],
            ]
          : [],
      color: t.prediction,
      dashStyle: 'Dot',
      lineWidth: 2.5,
      marker: {
        enabled: true,
        radius: 6,
        fillColor: t.prediction,
        lineWidth: 2,
        lineColor: '#ffffff',
        symbol: 'circle',
        states: { hover: { radius: 8, lineWidth: 2 } },
      },
      enableMouseTracking: viewType === 'national',
      stickyTracking: false,
      visible: viewType === 'national',
      showInLegend: viewType === 'national',
      tooltip: {
        headerFormat: '',
        pointFormat: `<b>Tu predicción</b><br/>Percentil nacional: ${perceivedPercentile}%<br/>Ingresos: {point.x:,.0f} €`,
      },
      zIndex: 5,
    },
  ]

  return {
    chart: {
      style: { fontFamily },
      animation: { duration: t.motionSlow, easing: 'easeOutCubic' },
      backgroundColor: 'transparent',
      spacing: [16, 12, 16, 12],
    },
    title: { text: '' },
    xAxis: {
      min: 0,
      max: p99,
      title: {
        text: 'Ingresos anuales equivalentes',
        style: titleStyle,
        margin: 12,
      },
      labels: {
        formatter: function () {
          return formatAxisEuros(this.value as number)
        },
        style: labelStyle,
      },
      lineColor: t.axisLine,
      lineWidth: 1,
      tickColor: t.axisLine,
      tickWidth: 1,
      gridLineWidth: 0,
      softMin: 0,
      softMax: p99,
    },
    yAxis: {
      title: { text: '' },
      labels: { enabled: false },
      gridLineWidth: 0,
      lineWidth: 0,
      softMin: 0,
    },
    legend: {
      align: 'center',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemStyle: { ...labelStyle, fontWeight: '600', color: t.text },
      itemHoverStyle: { color: t.primary },
      itemMarginBottom: 8,
      symbolRadius: 6,
      symbolHeight: 10,
      symbolWidth: 10,
      symbolPadding: 6,
    },
    tooltip: {
      enabled: true,
      shared: false,
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
      borderColor: t.axisLine,
      borderWidth: 1,
      borderRadius: 12,
      shadow: false,
      style: { ...labelStyle, color: t.text, fontSize: '13px' },
      padding: 10,
      useHTML: false,
      formatter: function () {
        const point = this.point
        const percentile =
          this.series.name === 'Tu predicción'
            ? perceivedPercentile
            : Math.round(currentPercentile)
        const label =
          this.series.name === 'Tu predicción' ? 'Tu predicción' : 'Tu posición'
        return `<b>${label}</b><br/>Percentil: ${percentile}%<br/>${formatEuros(
          point.x as number
        )}`
      },
    },
    plotOptions: {
      series: {
        animation: { duration: t.motionSlow, easing: 'easeOutCubic' },
      },
      area: {
        animation: { duration: t.motionSlow, easing: 'easeOutCubic' },
      },
      line: {
        animation: { duration: t.motionBase, easing: 'easeOutCubic' },
      },
    },
    series,
    credits: { enabled: false },
  }
}
