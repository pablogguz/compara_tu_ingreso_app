import { normalizeText } from './validation'

// Ranking for the municipality combobox (src/components/ensayo/MunicipalitySearch.tsx).

export interface MunicipalityOption {
  value: string
  label: string
  munName: string
  provName: string
}

// Higher score = better match = closer to top of the dropdown. 0 = no match.
export function scoreOption(opt: MunicipalityOption, search: string): number {
  const munName = normalizeText(opt.munName)
  const provName = normalizeText(opt.provName)
  if (munName === search) return 1000
  if (munName.startsWith(search)) return 500
  if (munName.includes(search)) return 100
  if (provName.includes(search)) return 10
  return 0
}

// Filter + rank the option list for a search string. Ties between
// equally-scored matches go to the shorter name (closer to what was typed),
// then alphabetical: "madr" → Madrid before Madremanya.
export function rankOptions(
  options: MunicipalityOption[],
  rawSearch: string
): MunicipalityOption[] {
  const search = normalizeText(rawSearch)
  if (!search) return options
  return options
    .map((o) => ({ o, s: scoreOption(o, search) }))
    .filter((x) => x.s > 0)
    .sort(
      (a, b) =>
        b.s - a.s ||
        a.o.munName.length - b.o.munName.length ||
        a.o.label.localeCompare(b.o.label, 'es')
    )
    .map((x) => x.o)
}
