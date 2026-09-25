// Core calculation functions matching the Shiny app logic

/**
 * Modified OECD equivalence scale (consumption units of the household)
 * Scale: 1 + max(0, adults-1)*0.5 + children*0.3
 */
export function equivalenceScale(adults: number, children: number): number {
  return 1 + Math.max(0, adults - 1) * 0.5 + children * 0.3;
}

/**
 * Calculate equivalised annual income
 */
export function calculateEquivIncome(
  monthlyIncome: number,
  adults: number,
  children: number
): number {
  const equivScale = equivalenceScale(adults, children);
  return (monthlyIncome * 12) / equivScale;
}

/**
 * Find percentile position for a given income value: the largest p where
 * percentiles[p - 1] <= value, i.e. the whole-number share of people with a
 * lower income. 0 below the 1st percentile, 100 at or above the 99th.
 */
export function findPercentile(value: number, percentiles: number[]): number {
  if (value < Math.min(...percentiles)) return 0;
  if (value >= Math.max(...percentiles)) return 100;
  
  // Find largest percentile index where value is >= percentile value
  for (let i = percentiles.length - 1; i >= 0; i--) {
    if (percentiles[i] <= value) {
      return i + 1; // percentile is 1-indexed
    }
  }
  return 1;
}

/**
 * Find value at a given percentile
 * Clamps percentile to [1, 100]
 */
export function findValueForPercentile(
  percentile: number,
  percentiles: number[]
): number {
  if (percentile <= 1) return percentiles[0];
  if (percentile >= 100) return percentiles[percentiles.length - 1];
  
  // percentiles array is 0-indexed but percentile values are 1-indexed
  const index = Math.max(0, Math.min(percentiles.length - 1, percentile - 1));
  return percentiles[Math.floor(index)];
}

/**
 * Format number as Spanish currency (es-ES)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with Spanish thousand separator
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(Math.round(value));
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
