// Mirror of the CSS tokens used in Highcharts. Keep in sync with :root in
// public/css/styles.css — chart visuals must match the surrounding UI.

export const chartTheme = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",

  // Palette
  primary: '#58a2ec',
  primaryDeep: '#155494',
  prediction: '#dc6356',
  text: '#0f172a',
  textMuted: '#64748b',
  grid: 'rgba(15, 23, 42, 0.06)',
  axisLine: '#e2e8f0',
  surface: '#ffffff',

  // Area-curve gradient stops
  areaTop: 'rgba(88, 162, 236, 0.32)',
  areaBottom: 'rgba(88, 162, 236, 0.02)',
  areaLine: '#58a2ec',

  // Motion
  motionFast: 200,
  motionBase: 400,
  motionSlow: 800,
} as const

export type ChartTheme = typeof chartTheme
