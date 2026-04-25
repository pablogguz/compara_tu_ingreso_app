'use client'

import { useMemo } from 'react'
import Select, { components } from 'react-select'
import { FixedSizeList as List } from 'react-window'
import { useMunicipalities } from '@/lib/DataContext'
import { normalizeText } from '@/lib/validation'
import { baseSelectStyles } from './selectStyles'

interface MunicipalityOption {
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

// Higher score = better match = closer to top of the dropdown.
function scoreOption(opt: MunicipalityOption, search: string): number {
  const munName = normalizeText(opt.munName)
  const provName = normalizeText(opt.provName)
  if (munName === search) return 1000
  if (munName.startsWith(search)) return 500
  if (munName.includes(search)) return 100
  if (provName.includes(search)) return 10
  return 0
}

const ROW_HEIGHT = 40
const MAX_MENU_HEIGHT = 280

// react-window virtualized menu list. Without this, rendering ~8k options
// freezes the UI on every keystroke.
function VirtualizedMenuList(props: any) {
  const { children, maxHeight, getValue, selectProps } = props
  const [value] = getValue()
  const inputValue: string = selectProps.inputValue || ''

  let sortedChildren = children
  if (inputValue && Array.isArray(children) && children.length > 0) {
    const search = normalizeText(inputValue)
    sortedChildren = [...children].sort((a: any, b: any) => {
      const aData = a?.props?.data
      const bData = b?.props?.data
      if (!aData || !bData) return 0
      const diff = scoreOption(bData, search) - scoreOption(aData, search)
      if (diff !== 0) return diff
      return aData.label?.localeCompare(bData.label) || 0
    })
  }

  if (!sortedChildren || !Array.isArray(sortedChildren)) {
    return <components.MenuList {...props}>{sortedChildren}</components.MenuList>
  }

  const height = Math.min(
    maxHeight || MAX_MENU_HEIGHT,
    sortedChildren.length * ROW_HEIGHT,
    MAX_MENU_HEIGHT
  )
  const initialOffset = value
    ? sortedChildren.findIndex(
        (c: any) => c?.props?.data?.value === value.value
      ) * ROW_HEIGHT
    : 0

  return (
    <List
      height={height}
      itemCount={sortedChildren.length}
      itemSize={ROW_HEIGHT}
      initialScrollOffset={initialOffset}
      width="100%"
    >
      {({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={style}>{sortedChildren[index]}</div>
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

  const options: MunicipalityOption[] = municipalities.map((m) => ({
    value: m.mun_code,
    label: `${m.mun_name} (${m.prov_name})`,
    munName: m.mun_name,
    provName: m.prov_name,
  }))

  const filterOption = (option: any, inputValue: string) => {
    if (!inputValue) return true
    const search = normalizeText(inputValue)
    const munName = normalizeText(option.data.munName || '')
    const provName = normalizeText(option.data.provName || '')
    return munName.includes(search) || provName.includes(search)
  }

  const portalTarget = useMemo(
    () => (typeof document !== 'undefined' ? document.body : null),
    []
  )

  return (
    <div className="question-step">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-map-marker-alt"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title">¿Dónde vives?</h2>
            <p className="question-subtitle">
              Selecciona tu municipio de residencia
            </p>
          </div>
        </header>
        <div className="question-content">
          <Select<MunicipalityOption, false>
            value={options.find((o) => o.value === value) || null}
            onChange={(opt) => onChange(opt?.value || '')}
            options={options}
            placeholder="Escribe tu municipio…"
            isClearable
            isSearchable
            components={{ MenuList: MenuListWithHeader }}
            noOptionsMessage={() => 'No se encontraron municipios'}
            filterOption={filterOption}
            maxMenuHeight={MAX_MENU_HEIGHT}
            menuPlacement="auto"
            menuPortalTarget={portalTarget}
            menuPosition="fixed"
            styles={baseSelectStyles}
          />
        </div>
        <div className="button-wrapper">
          <span className="btn-spacer" aria-hidden="true" />
          <button
            onClick={onNext}
            className="btn-nav next-btn"
            disabled={!value}
          >
            Siguiente
            <i
              className="fas fa-arrow-right btn-icon-right"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>
    </div>
  )
}
