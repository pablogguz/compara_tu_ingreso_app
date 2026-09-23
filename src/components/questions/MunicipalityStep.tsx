'use client'

import { useMemo, useState } from 'react'
import Select, { components } from 'react-select'
import { FixedSizeList as List } from 'react-window'
import { useMunicipalities } from '@/lib/DataContext'
import { normalizeText } from '@/lib/validation'
import { baseSelectStyles } from './selectStyles'

export interface MunicipalityOption {
  value: string
  label: string
  munName: string
  provName: string
}

interface MunicipalityStepProps {
  value: string
  onChange: (code: string) => void
  onNext: () => void
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

const ROW_HEIGHT = 40
const MAX_MENU_HEIGHT = 280

// react-window virtualized menu list. Without this, rendering ~8k options
// freezes the UI on every keystroke.
function VirtualizedMenuList(props: any) {
  const { children, maxHeight, getValue } = props
  const [value] = getValue()

  if (!children || !Array.isArray(children)) {
    return <components.MenuList {...props}>{children}</components.MenuList>
  }

  const height = Math.min(
    maxHeight || MAX_MENU_HEIGHT,
    children.length * ROW_HEIGHT,
    MAX_MENU_HEIGHT
  )
  const initialOffset = value
    ? Math.max(
        0,
        children.findIndex((c: any) => c?.props?.data?.value === value.value)
      ) * ROW_HEIGHT
    : 0

  return (
    <List
      height={height}
      itemCount={children.length}
      itemSize={ROW_HEIGHT}
      initialScrollOffset={initialOffset}
      width="100%"
    >
      {({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={style}>{children[index]}</div>
      )}
    </List>
  )
}

// Wraps the virtualized list with a small contextual header at the top of the
// menu. Shows total count when idle, filtered count when the user is typing.
function MenuListWithHeader(props: any) {
  const { children, selectProps, options } = props
  const inputValue: string = selectProps.inputValue || ''
  const total = Array.isArray(options) ? options.length : 0
  const filtered =
    Array.isArray(children) && children.length > 0 ? children.length : 0

  let header: string
  if (!inputValue) {
    header = `${total.toLocaleString('es-ES')} municipios · escribe para buscar`
  } else if (filtered === 0) {
    header = 'sin resultados'
  } else if (filtered === 1) {
    header = '1 resultado'
  } else {
    header = `${filtered.toLocaleString('es-ES')} resultados`
  }

  return (
    <>
      <div className="select-menu__header">{header}</div>
      <VirtualizedMenuList {...props} />
    </>
  )
}

export default function MunicipalityStep({
  value,
  onChange,
  onNext,
}: MunicipalityStepProps) {
  const { municipalities } = useMunicipalities()
  const [inputValue, setInputValue] = useState('')

  const options: MunicipalityOption[] = useMemo(
    () =>
      municipalities.map((m) => ({
        value: m.mun_code,
        label: `${m.mun_name} (${m.prov_name})`,
        munName: m.mun_name,
        provName: m.prov_name,
      })),
    [municipalities]
  )

  const visibleOptions = useMemo(
    () => rankOptions(options, inputValue),
    [options, inputValue]
  )

  const portalTarget = useMemo(
    () => (typeof document !== 'undefined' ? document.body : null),
    []
  )

  return (
    <section className="question-step" aria-labelledby="q-municipality">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-map-marker-alt"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title" id="q-municipality">
              ¿Dónde vives?
            </h2>
            <p className="question-subtitle">
              Selecciona tu municipio de residencia
            </p>
          </div>
        </header>

        <div className="question-content">
          <div className="select-field">
            <Select<MunicipalityOption, false>
            // stable ids so server- and client-rendered markup match
            instanceId="municipality"
            inputId="municipality-select"
            aria-label="Municipio de residencia"
            value={options.find((o) => o.value === value) || null}
            onChange={(opt) => onChange(opt?.value || '')}
            inputValue={inputValue}
            onInputChange={(text, meta) =>
              setInputValue(meta.action === 'input-change' ? text : '')
            }
            options={visibleOptions}
            placeholder="Escribe tu municipio…"
            isClearable
            isSearchable
            components={{ MenuList: MenuListWithHeader }}
            noOptionsMessage={() => 'No se encontraron municipios'}
            // ranking/filtering already happened in `visibleOptions`
            filterOption={() => true}
            maxMenuHeight={MAX_MENU_HEIGHT}
            menuPlacement="auto"
            menuPortalTarget={portalTarget}
            menuPosition="fixed"
            styles={baseSelectStyles}
            />
          </div>
        </div>

        <div className="button-wrapper">
          <button
            type="button"
            onClick={onNext}
            className="btn btn--primary"
            disabled={!value}
          >
            Siguiente
            <i
              className="fas fa-arrow-right btn__icon btn__icon--right"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>
    </section>
  )
}
