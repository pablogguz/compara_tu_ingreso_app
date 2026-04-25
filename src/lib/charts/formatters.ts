// Formatters used inside Highcharts callbacks. These run with `this` bound to
// the Highcharts axis/point context, so they're written as plain functions.

const eurosFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function formatEuros(value: number): string {
  return eurosFormatter.format(Math.round(value))
}

export function formatAxisEuros(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k €`
  return `${Math.round(value)} €`
}
