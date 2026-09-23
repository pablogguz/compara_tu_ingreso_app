import { normalizeText } from './validation'

// Municipality search shared by the questionnaire's picker and the redesign's
// combobox: one ranking, so every search box finds the same municipality first.

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

// Filter + rank the option list for a search string. Done on the options
// themselves (not on the rendered menu rows) so that what the user sees, what
// the keyboard focuses and what Enter selects are all the same list.
//
// Ties between equally-scored matches go to the shorter name (closer to what
// was typed), then alphabetical: "madr" → Madrid before Madremanya.
//
// The result deliberately contains *fresh* option objects. react-select keeps
// its keyboard focus on the previously focused option as long as that same
// object is still present in `options` — so "mad" (Madarcos focused first)
// followed by "madr" would leave focus on Madarcos even though it is now a
// province-only match at the bottom of the list. New identities make
// react-select re-focus the top-ranked option on every keystroke.
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
    .map((x) => ({ ...x.o }))
}
