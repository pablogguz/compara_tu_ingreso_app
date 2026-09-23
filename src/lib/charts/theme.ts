// Mirror of the CSS tokens used in Highcharts. Keep in sync with :root in
// public/css/styles.css — chart visuals must match the surrounding UI.
// tests/designContract.test.ts fails if the two drift apart.

export const chartTheme = {
  // Static fallback; resolveChartFont() swaps in the live --font-ui value
  // (which carries the self-hosted next/font family name) at render time.
  fontFamily:
    "'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",

  // Palette
  primary: '#58a2ec',
  primaryDeep: '#155494',
  prediction: '#dc6356',
  text: '#0f172a',
  textMuted: '#64748b',
  grid: 'rgba(15, 23, 42, 0.06)',
  axisLine: '#e2e8f0',
  surface: '#ffffff',

  // Area-curve gradient stops: full up to the household's position, paler
  // beyond it
  areaTop: 'rgba(88, 162, 236, 0.32)',
  areaBottom: 'rgba(88, 162, 236, 0.02)',
  areaLine: '#58a2ec',
  areaDimTop: 'rgba(88, 162, 236, 0.1)',
  areaDimBottom: 'rgba(88, 162, 236, 0.01)',
  areaDimLine: 'rgba(88, 162, 236, 0.45)',

  // Motion
  motionFast: 200,
  motionBase: 400,
  motionSlow: 800,
} as const

export type ChartTheme = typeof chartTheme

// Highcharts writes font-family inline on every SVG <text>, so it needs a real
// family list rather than a var() reference. Read the computed --font-ui token
// from <html> when running in a browser; fall back to the static stack.
export function resolveChartFont(): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return chartTheme.fontFamily
  }
  try {
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--font-ui')
      .trim()
    return value || chartTheme.fontFamily
  } catch {
    return chartTheme.fontFamily
  }
}
