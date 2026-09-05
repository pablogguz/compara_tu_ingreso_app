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

// Passed as a function, not a name. Highcharts resolves string easings against
// Math.<name> by mutating the animation object it is handed — which for
// chart.animation is the live chart.options object — and a chart.update()
// that lands mid-animation re-merges the string over the resolved function
// and crashes the running tween. A function survives the merge.
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

// Class hooks for the intro choreography in styles_results.css: the guess line
// and the position line drop in (CSS keyframes) after the curve has drawn.
export const SERIES_CLASS = {
  guess: 'series-guess',
  position: 'series-position',
} as const

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

  // Vertical marker lines as two identified points. On a view change
  // Highcharts matches points by id and updates them in place, so the line
  // slides to its new x (and the top marker to the new yMax) instead of being
  // torn down and redrawn.
  const verticalLine = (key: string, x: number) => [
    { id: `${key}-lo`, x, y: 0 },
    { id: `${key}-hi`, x, y: yMax },
  ]

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'area',
      name: seriesNameByView[viewType],
      data: seriesData,
      // The density grid has 1,000 points and the x axis stops at p99, so
      // with the default threshold (300) Highcharts crops the series — and
      // a cropped series is re-created on every update instead of having
      // its points updated in place. Above the point count, the curve morphs
      // between national / provincial / municipal.
      cropThreshold: 10000,
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
      className: SERIES_CLASS.position,
      // Entrance is choreographed in CSS (lineDrop); Highcharts' own
      // left-to-right clip reveal would make a vertical line pop instantly.
      animation: false,
      data: verticalLine('position', userValueOnAxis),
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
      className: SERIES_CLASS.guess,
      animation: false,
      data: viewType === 'national' ? verticalLine('guess', predictedValue) : [],
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
      animation: { duration: t.motionSlow, easing: easeOutCubic },
      backgroundColor: 'transparent',
      spacing: [8, 12, 6, 12],
    },
    title: { text: '' },
    xAxis: {
      min: 0,
      max: p99,
      title: {
        text: 'Ingresos anuales equivalentes',
        style: titleStyle,
        margin: 8,
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
      itemMarginBottom: 4,
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
        animation: { duration: t.motionSlow, easing: easeOutCubic },
      },
      area: {
        // the curve draws left→right over a slow beat
        animation: { duration: t.motionSlow * 1.4, easing: easeOutCubic },
      },
      line: {
        animation: false,
      },
    },
    series,
    credits: { enabled: false },
  }
}
