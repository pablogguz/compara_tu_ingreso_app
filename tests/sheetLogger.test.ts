import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logResponseToSheet, type SheetLogPayload } from '@/lib/sheetLogger'

const PAYLOAD: SheetLogPayload = {
  timestamp: '2026-04-25T00:00:00Z',
  municipality: '28079',
  monthly_income: 2500,
  adults: 1,
  children: 0,
  perceived_percentile: 50,
  actual_percentile: 62,
  equiv_income: 30000,
}

describe('logResponseToSheet', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.removeItem('cookieConsent')
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    } as Response)
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does NOT fire when consent is null', () => {
    logResponseToSheet(PAYLOAD)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does NOT fire when consent is rejected', () => {
    localStorage.setItem('cookieConsent', 'rejected')
    logResponseToSheet(PAYLOAD)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fires when consent is accepted', () => {
    localStorage.setItem('cookieConsent', 'accepted')
    logResponseToSheet(PAYLOAD)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('POSTs JSON to the trailing-slash URL (avoids the 308 redirect)', () => {
    localStorage.setItem('cookieConsent', 'accepted')
    logResponseToSheet(PAYLOAD)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/appendResponse/')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json'
    )
    expect(JSON.parse(init.body as string)).toEqual(PAYLOAD)
  })
})
