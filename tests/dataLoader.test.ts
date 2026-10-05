import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The loaders against the real files in public/data (the contract with
// scripts/convert-data.R): fetch is served from disk.
const fetched: string[] = []
vi.stubGlobal('fetch', async (url: string) => {
  fetched.push(url)
  try {
    const buf = readFileSync(path.join(__dirname, '..', 'public', url))
    return { ok: true, status: 200, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
  } catch {
    return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }
  }
})

const load = () => import('@/lib/dataLoader')

beforeEach(() => {
  fetched.length = 0
  vi.resetModules()
})

const ascending = (v: number[]) => v.every((x, i) => i === 0 || x >= v[i - 1])

describe('dataLoader', () => {
  it('reads the percentiles at the three levels', async () => {
    const d = await load()
    const [nat, prov, mun] = await Promise.all([
      d.loadNationalPercentiles(),
      d.loadProvincialPercentiles('28'),
      d.loadMunicipalPercentiles('28079'),
    ])
    for (const p of [nat, prov, mun]) {
      expect(p).toHaveLength(99)
      expect(ascending(p)).toBe(true)
    }
    expect(fetched).toContain('/data/mun_percentiles/mun_28.arrow')
  })

  it('reads the density curves on a 500 € grid up to 160.000 €', async () => {
    const d = await load()
    for (const c of [await d.loadNationalDensity(), await d.loadProvincialDensity('28'), await d.loadMunicipalDensity('28079', '28')]) {
      expect(c).toHaveLength(321)
      expect(c[1].x - c[0].x).toBe(500)
      expect(c[c.length - 1].x).toBe(160000)
      expect(c.some((p) => p.y > 0)).toBe(true)
    }
  })

  it('finds a municipality’s figures, and null for an unknown one', async () => {
    const d = await load()
    const madrid = await d.loadMunicipalityStats('28079')
    expect(madrid?.net_income_equiv).toBeGreaterThan(20000)
    expect(madrid?.pct_foreign_born).toBeGreaterThan(0)
    expect(await d.loadMunicipalityStats('28999')).toBeNull()
  })

  it('has a curve and percentiles for every municipality in the lookup', async () => {
    const d = await load()
    const lookup = await d.loadMunicipalityLookup()
    expect(lookup.length).toBeGreaterThan(8000)
    const missing: string[] = []
    for (const m of lookup) {
      const ok = await Promise.all([d.loadMunicipalPercentiles(m.mun_code), d.loadMunicipalDensity(m.mun_code, m.prov_code)])
        .then(() => true)
        .catch(() => false)
      if (!ok) missing.push(m.mun_code)
    }
    expect(missing).toEqual([])
  })

  it('fetches each file once, however many calls share it', async () => {
    const d = await load()
    d.prefetchMunicipality('28079')
    await Promise.all([d.loadMunicipalPercentiles('28079'), d.loadMunicipalPercentiles('28005'), d.loadMunicipalDensity('28079', '28')])
    const counts = fetched.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u]: (acc[u] ?? 0) + 1 }), {})
    expect(Object.values(counts).every((n) => n === 1)).toBe(true)
    expect(Object.keys(counts).sort()).toEqual(
      [
        '/data/density_curve.arrow',
        '/data/density_curve_mun/mun_28.arrow',
        '/data/density_curve_prov.arrow',
        '/data/mun_percentiles/mun_28.arrow',
        '/data/municipality_stats/mun_28.arrow',
        '/data/national_percentiles.arrow',
        '/data/provincial_percentiles.arrow',
      ].sort()
    )
  })
})
