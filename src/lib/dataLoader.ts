// Data loading from public/data (written by scripts/convert-data.R).
// What the landing page needs, Spain and the municipality list, is JSON; the
// rest is Apache Arrow, split by province so a household downloads only its
// own slice (~0.5–1 MB), and the Arrow reader itself is loaded only then.
// Each file is fetched once: the cache holds the promise, so concurrent calls
// (the calculation, the figures, a prefetch) share one request.
import type { Table } from 'apache-arrow'

const files = new Map<string, Promise<unknown>>()

function once<T>(path: string, load: (response: Response) => Promise<T>): Promise<T> {
  let pending = files.get(path) as Promise<T> | undefined
  if (!pending) {
    pending = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
      return load(response)
    })
    // a failed request is not cached, so a retry fetches again
    pending.catch(() => files.delete(path))
    files.set(path, pending)
  }
  return pending
}

const loadTable = (path: string) =>
  once<Table>(path, async (response) => {
    const [{ tableFromIPC }, buffer] = await Promise.all([import('apache-arrow'), response.arrayBuffer()])
    return tableFromIPC(new Uint8Array(buffer))
  })

interface National {
  percentiles: number[]
  density: { x: number[]; y: number[] }
}
const loadNational = () => once<National>('/data/national.json', (response) => response.json())

function column(table: Table, name: string): number[] {
  const values = table.getChild(name)
  if (!values) throw new Error(`No data for ${name}`)
  return Array.from(values.toArray() as ArrayLike<number>)
}

function strings(table: Table, name: string): string[] {
  const values = table.getChild(name)
  if (!values) throw new Error(`No data for ${name}`)
  return Array.from(values as Iterable<string>)
}

function curve(table: Table, name: string): Array<{ x: number; y: number }> {
  const xs = column(table, 'x')
  const ys = column(table, name)
  return xs.map((x, i) => ({ x, y: ys[i] }))
}

/** The province of an INE municipality code ("28079" → "28"). */
const provinceOf = (munCode: string) => munCode.slice(0, 2)

/** Income at percentiles 1…99 in Spain. */
export async function loadNationalPercentiles(): Promise<number[]> {
  return (await loadNational()).percentiles
}

/** Income at percentiles 1…99 in a province. */
export async function loadProvincialPercentiles(provCode: string): Promise<number[]> {
  return column(await loadTable('/data/provincial_percentiles.arrow'), provCode)
}

/** Income at percentiles 1…99 in a municipality (its province's file). */
export async function loadMunicipalPercentiles(munCode: string): Promise<number[]> {
  return column(await loadTable(`/data/mun_percentiles/mun_${provinceOf(munCode)}.arrow`), munCode)
}

/** Every municipality with an estimated distribution. */
export async function loadMunicipalityLookup(): Promise<
  Array<{ mun_code: string; mun_name: string; prov_code: string; prov_name: string }>
> {
  const lookup = await once<{ provinces: Array<[string, string]>; municipalities: Array<[string, string]> }>(
    '/data/municipality_lookup.json',
    (response) => response.json()
  )
  const provName = new Map(lookup.provinces)
  return lookup.municipalities.map(([code, name]) => ({
    mun_code: code,
    mun_name: name,
    prov_code: provinceOf(code),
    prov_name: provName.get(provinceOf(code)) ?? '',
  }))
}

/** Spain's density curve, every 500 € up to 160.000 €. */
export async function loadNationalDensity(): Promise<Array<{ x: number; y: number }>> {
  const { density } = await loadNational()
  return density.x.map((x, i) => ({ x, y: density.y[i] }))
}

/** A province's density curve. */
export async function loadProvincialDensity(provCode: string): Promise<Array<{ x: number; y: number }>> {
  return curve(await loadTable('/data/density_curve_prov.arrow'), provCode)
}

/** A municipality's density curve (its province's file). */
export async function loadMunicipalDensity(munCode: string, provCode: string): Promise<Array<{ x: number; y: number }>> {
  return curve(await loadTable(`/data/density_curve_mun/mun_${provCode}.arrow`), munCode)
}

/** A municipality's context figures, or null when there are none. */
export async function loadMunicipalityStats(munCode: string): Promise<{
  net_income_equiv: number
  net_income_equiv_is_imputed: number
  pct_higher_ed_completed: number
  pct_higher_ed_completed_is_imputed: number
  pct_foreign_born: number
  pct_foreign_born_is_imputed: number
} | null> {
  const table = await loadTable(`/data/municipality_stats/mun_${provinceOf(munCode)}.arrow`)
  const i = strings(table, 'mun_code').indexOf(munCode)
  if (i === -1) return null
  const row: Record<string, unknown> = {}
  for (const field of table.schema.fields) row[field.name] = table.getChild(field.name)?.get(i)
  return row as never
}

/**
 * Starts downloading everything a household in this municipality will need,
 * so that by the time the questions are answered the calculation and the
 * figures are instant. Failures are left for the real calls to report.
 */
export function prefetchMunicipality(munCode: string): void {
  const prov = provinceOf(munCode)
  const quiet = (p: Promise<unknown>) => p.catch(() => {})
  quiet(loadNationalPercentiles())
  quiet(loadProvincialPercentiles(prov))
  quiet(loadMunicipalPercentiles(munCode))
  quiet(loadNationalDensity())
  quiet(loadProvincialDensity(prov))
  quiet(loadMunicipalDensity(munCode, prov))
  quiet(loadMunicipalityStats(munCode))
}
