import { describe, it, expect } from 'vitest'
import { buildDistributionOptions } from '@/lib/charts/distributionOptions'
import { chartTheme, resolveChartFont } from '@/lib/charts/theme'
import { DENSITY } from './helpers/mockData'

const base = {
  density: DENSITY,
  p99: 90000,
  userValueOnAxis: 30000,
  predictedValue: 42000,
  currentPercentile: 61,
  perceivedPercentile: 70,
}

function seriesOf(opts: ReturnType<typeof buildDistributionOptions>) {
  return opts.series as any[]
}

describe('buildDistributionOptions', () => {
  it('builds area + position + prediction series for the national view', () => {
    const opts = buildDistributionOptions({ ...base, viewType: 'national' })
    const s = seriesOf(opts)
    expect(s.map((x) => x.type)).toEqual(['area', 'line', 'line'])
    expect(s[0].name).toBe('Distribución nacional')
    expect(s[1].name).toBe('Tu posición')
    expect(s[1].data[0].x).toBe(30000)
    expect(s[2].name).toBe('Tu predicción')
    expect(s[2].visible).toBe(true)
    expect(s[2].data[0].x).toBe(42000)
  })

  it('keeps the curve un-cropped and ids the marker points so view changes morph', () => {
    const s = seriesOf(buildDistributionOptions({ ...base, viewType: 'national' }))
    // real density curves carry 1,000 points; Highcharts only updates points
    // in place (and animates the path) when the series is not cropped
    expect(s[0].cropThreshold).toBeGreaterThan(1000)
    expect(s[1].data.map((p: any) => p.id)).toEqual(['position-lo', 'position-hi'])
    expect(s[2].data.map((p: any) => p.id)).toEqual(['guess-lo', 'guess-hi'])
    expect(s[1].data[1].y).toBeGreaterThan(0)
  })

  it('hides the prediction line outside the national view', () => {
    for (const viewType of ['provincial', 'municipal'] as const) {
      const s = seriesOf(buildDistributionOptions({ ...base, viewType }))
      expect(s[2].visible).toBe(false)
      expect(s[2].showInLegend).toBe(false)
      expect(s[2].data).toEqual([])
      expect(s[0].name).toMatch(viewType === 'provincial' ? /provincial/ : /municipal/)
    }
  })

  it('bounds the x axis at the 99th percentile', () => {
    const opts = buildDistributionOptions({ ...base, viewType: 'national' })
    const x = opts.xAxis as any
    expect(x.min).toBe(0)
    expect(x.max).toBe(90000)
  })

  it('uses theme colours and a resolved font family', () => {
    const opts = buildDistributionOptions({ ...base, viewType: 'national' })
    const s = seriesOf(opts)
    expect(s[0].color).toBe(chartTheme.areaLine)
    expect(s[1].color).toBe(chartTheme.primaryDeep)
    expect(s[2].color).toBe(chartTheme.prediction)
    expect((opts.chart as any).style.fontFamily).toBe(resolveChartFont())
    expect(resolveChartFont().length).toBeGreaterThan(0)
  })

  it('renders the chart without a Highcharts credit line', () => {
    const opts = buildDistributionOptions({ ...base, viewType: 'national' })
    expect(opts.credits?.enabled).toBe(false)
  })

  it('keeps the curve full-colour up to your position and paler beyond', () => {
    const s = seriesOf(buildDistributionOptions({ ...base, viewType: 'national' }))
    expect(s[0].zoneAxis).toBe('x')
    expect(s[0].zones).toHaveLength(2)
    // first zone inherits the series colour and fill
    expect(s[0].zones[0]).toEqual({ value: 30000 })
    expect(s[0].zones[1].value).toBeUndefined()
    expect(s[0].zones[1].color).toBe(chartTheme.areaDimLine)
  })
})
