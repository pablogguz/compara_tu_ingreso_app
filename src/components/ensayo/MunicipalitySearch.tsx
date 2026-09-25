'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { useMunicipalities } from '@/lib/DataContext'
import { normalizeText } from '@/lib/validation'
import { rankOptions, type MunicipalityOption } from '@/lib/municipalitySearch'
import { naturalName } from '@/lib/format'

// Class hooks for each design. Positioning is the design's job: give `root`
// position: relative and `list` position: absolute (or lay it out in flow).
export interface MunicipalitySearchClasses {
  root?: string
  input?: string
  list?: string
  option?: string
  /** added to the keyboard-highlighted option */
  optionActive?: string
  name?: string
  meta?: string
  /** the "keep typing" / "no results" line inside the list */
  status?: string
}

interface MunicipalitySearchProps {
  /** the accessible name, unless `labelledBy` points at a visible label */
  label: string
  labelledBy?: string
  /** a mun_code, or '' */
  value: string
  onChange: (code: string) => void
  placeholder?: string
  classes?: MunicipalitySearchClasses
  maxResults?: number
  autoFocus?: boolean
  /** id for the input, so a <label htmlFor> can point at it */
  inputId?: string
}

/** "Madrid (Madrid)" — how a selected municipality reads in the box. */
export function municipalityLabel(o: Pick<MunicipalityOption, 'munName' | 'provName'>): string {
  return `${o.munName} (${o.provName})`
}

// Accessible combobox (ARIA 1.2 pattern) over the ~8,000 municipalities, ranked
// with the same function as the live app. Headless: no styles of its own.
export default function MunicipalitySearch({
  label,
  labelledBy,
  value,
  onChange,
  placeholder = 'Escribe tu municipio…',
  classes = {},
  maxResults = 8,
  autoFocus,
  inputId,
}: MunicipalitySearchProps) {
  const { municipalities, loading } = useMunicipalities()
  const uid = useId()
  const listId = `${uid}-list`
  const optionId = (i: number) => `${uid}-opt-${i}`
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  // the list opens only once the user types, not when they come back to a
  // box that already holds a municipality
  const [typed, setTyped] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const options = useMemo<MunicipalityOption[]>(
    () =>
      municipalities.map((m) => {
        const munName = naturalName(m.mun_name)
        const provName = naturalName(m.prov_name)
        return { value: m.mun_code, munName, provName, label: `${munName} (${provName})` }
      }),
    [municipalities]
  )
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value])

  const hasQuery = normalizeText(query).length > 0
  const results = useMemo(
    () => (hasQuery ? rankOptions(options, query).slice(0, maxResults) : []),
    [options, query, hasQuery, maxResults]
  )
  const open = editing && typed && hasQuery
  const activeIndex = Math.min(active, Math.max(0, results.length - 1))

  const choose = (o: MunicipalityOption) => {
    onChange(o.value)
    setQuery('')
    setEditing(false)
    setTyped(false)
    setActive(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!editing) setEditing(true)
      if (!typed && hasQuery) setTyped(true)
      setActive((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter' && open && results[activeIndex]) {
      e.preventDefault()
      choose(results[activeIndex])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setQuery('')
      setEditing(false)
      setTyped(false)
    }
  }

  const shown = editing ? query : selected ? municipalityLabel(selected) : ''
  const statusText = loading && !options.length
    ? 'Cargando municipios…'
    : results.length === 0
      ? 'Ningún municipio coincide'
      : null

  return (
    <div className={classes.root}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results.length ? optionId(activeIndex) : undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        className={classes.input}
        placeholder={loading && !options.length ? 'Cargando municipios…' : placeholder}
        value={shown}
        onFocus={(e) => {
          setEditing(true)
          setTyped(false)
          const current = selected ? municipalityLabel(selected) : ''
          setQuery(current)
          const el = e.currentTarget
          // select on the next frame (Safari drops a selection made on focus),
          // unless the user has already started typing
          requestAnimationFrame(() => {
            if (document.activeElement === el && el.value === current) el.select()
          })
        }}
        onChange={(e) => {
          setEditing(true)
          setTyped(true)
          setQuery(e.target.value)
          setActive(0)
        }}
        onBlur={() => {
          setEditing(false)
          setTyped(false)
          setQuery('')
        }}
        onKeyDown={onKeyDown}
      />
      <ul id={listId} role="listbox" aria-label="Municipios" hidden={!open} className={classes.list}>
        {results.map((o, i) => (
          <li
            key={o.value}
            id={optionId(i)}
            role="option"
            aria-selected={i === activeIndex}
            aria-label={`${o.munName}, ${o.provName}`}
            className={[classes.option, i === activeIndex ? classes.optionActive : ''].filter(Boolean).join(' ')}
            // keep focus in the input so blur doesn't close the list first
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(o)}
          >
            <span className={classes.name}>{o.munName}</span>
            <span className={classes.meta}>{o.provName}</span>
          </li>
        ))}
        {open && statusText && (
          <li role="presentation" className={classes.status}>
            {statusText}
          </li>
        )}
      </ul>
    </div>
  )
}
