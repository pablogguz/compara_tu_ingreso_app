import { getCookieConsent } from './analytics'

export interface SheetLogPayload {
  timestamp: string
  municipality: string
  monthly_income: number
  adults: number
  children: number
  perceived_percentile: number
  actual_percentile: number
  equiv_income: number
}

// Trailing slash matters: next.config.js has `trailingSlash: true`, so
// /api/appendResponse 308-redirects to /api/appendResponse/. Some browsers
// have historically dropped the POST body across redirects — we hit the
// final URL directly to avoid the round trip.
const ENDPOINT = '/api/appendResponse/'

// Fire-and-forget POST. Only fires when the user has accepted the cookie
// banner. Errors are logged but never surfaced to the caller — sheet logging
// is research telemetry, not a feature the user waits on.
export function logResponseToSheet(payload: SheetLogPayload): void {
  if (getCookieConsent() !== 'accepted') return

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(async (r) => {
      if (!r.ok) {
        const detail = await r.text().catch(() => '')
        console.warn(`[sheetLogger] HTTP ${r.status}`, detail)
      }
    })
    .catch((err) => console.warn('[sheetLogger] network error', err))
}
