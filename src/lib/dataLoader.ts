// Data loading utilities using Apache Arrow
import { tableFromIPC } from 'apache-arrow';

/**
 * Load Arrow file and convert to appropriate format
 */
async function loadArrowFile(path: string): Promise<any> {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  const table = tableFromIPC(new Uint8Array(buffer));
  return table;
}

/**
 * Convert Arrow table to array of objects
 */
function tableToObjects<T>(table: any): T[] {
  const result: T[] = [];
  for (let i = 0; i < table.numRows; i++) {
    const row: any = {};
    for (const field of table.schema.fields) {
      row[field.name] = table.getChild(field.name)?.get(i);
    }
    result.push(row);
  }
  return result;
}

/**
 * Convert Arrow table to simple array (for single column data)
 */
function tableToArray(table: any, columnName: string): number[] {
  const column = table.getChild(columnName);
  const result: number[] = [];
  for (let i = 0; i < column.length; i++) {
    result.push(column.get(i));
  }
  return result;
}

// Cache for loaded data
const dataCache: Map<string, any> = new Map();

/**
 * Load national percentiles
 */
export async function loadNationalPercentiles(): Promise<number[]> {
  const cacheKey = 'national_percentiles';
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const table = await loadArrowFile('/data/national_percentiles.arrow');
  const values = tableToArray(table, 'value');
  dataCache.set(cacheKey, values);
  return values;
}

/**
 * Load provincial percentiles for a specific province
 */
export async function loadProvincialPercentiles(
  provCode: string
): Promise<number[]> {
  const cacheKey = `provincial_percentiles`;
  
  let table;
  if (dataCache.has(cacheKey)) {
    table = dataCache.get(cacheKey);
  } else {
    table = await loadArrowFile('/data/provincial_percentiles.arrow');
    dataCache.set(cacheKey, table);
  }

  return tableToArray(table, provCode);
}

/**
 * Load municipal percentiles for a specific municipality
 */
export async function loadMunicipalPercentiles(
  munCode: string
): Promise<number[]> {
  const cacheKey = `mun_percentiles`;
  
  let table;
  if (dataCache.has(cacheKey)) {
    table = dataCache.get(cacheKey);
  } else {
    table = await loadArrowFile('/data/mun_percentiles.arrow');
    dataCache.set(cacheKey, table);
  }

  return tableToArray(table, munCode);
}

/**
 * Load municipality lookup data
 */
export async function loadMunicipalityLookup(): Promise<
  Array<{
    mun_code: string;
    mun_name: string;
    prov_code: string;
    prov_name: string;
  }>
> {
  const cacheKey = 'municipality_lookup';
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const table = await loadArrowFile('/data/municipality_lookup.arrow');
  const data = tableToObjects<{
    mun_code: string;
    mun_name: string;
    prov_code: string;
    prov_name: string;
  }>(table);
  dataCache.set(cacheKey, data);
  return data;
}

/**
 * Load national density curve
 */
export async function loadNationalDensity(): Promise<
  Array<{ x: number; y: number }>
> {
  const cacheKey = 'density_curve';
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const table = await loadArrowFile('/data/density_curve.arrow');
  const data = tableToObjects<{ x: number; y: number }>(table);
  dataCache.set(cacheKey, data);
  return data;
}

/**
 * Load provincial density curve
 */
export async function loadProvincialDensity(
  provCode: string
): Promise<Array<{ x: number; y: number }>> {
  const cacheKey = `density_prov_${provCode}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const table = await loadArrowFile('/data/density_curve_prov.arrow');
  const allData = tableToObjects<{
    prov_code: string;
    x: number;
    y: number;
  }>(table);
  
  const filtered = allData
    .filter((d) => d.prov_code === provCode)
    .map((d) => ({ x: d.x, y: d.y }));
  
  dataCache.set(cacheKey, filtered);
  return filtered;
}

/**
 * Load municipal density curve
 */
export async function loadMunicipalDensity(
  munCode: string,
  provCode: string
): Promise<Array<{ x: number; y: number }>> {
  const cacheKey = `density_mun_${munCode}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const table = await loadArrowFile(
    `/data/density_curve_mun/mun_${provCode}.arrow`
  );
  const allData = tableToObjects<{
    mun_code: string;
    x: number;
    y: number;
  }>(table);
  
  const filtered = allData
    .filter((d) => d.mun_code === munCode)
    .map((d) => ({ x: d.x, y: d.y }));
  
  dataCache.set(cacheKey, filtered);
  return filtered;
}

/**
 * Load municipality statistics
 */
export async function loadMunicipalityStats(munCode: string): Promise<{
  net_income_equiv: number;
  net_income_equiv_is_imputed: number;
  pct_higher_ed_completed: number;
  pct_higher_ed_completed_is_imputed: number;
  pct_foreign_born: number;
  pct_foreign_born_is_imputed: number;
} | null> {
  const cacheKey = 'municipality_stats';
  
  let allStats;
  if (dataCache.has(cacheKey)) {
    allStats = dataCache.get(cacheKey);
  } else {
    const table = await loadArrowFile('/data/municipality_stats.arrow');
    allStats = tableToObjects(table);
    dataCache.set(cacheKey, allStats);
  }

  return allStats.find((s: any) => s.mun_code === munCode) || null;
}
