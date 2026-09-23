'use client'

import { useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from 'react'
import type { Flow } from '../shared/useFlow'
import { LIMITS } from '../shared/useFlow'
import MunicipalitySearch from '../shared/MunicipalitySearch'
import { num } from '../shared/format'
import { amount, editableAmount, parseAmount, unitsSum, YEAR } from './copy'
import { FIELD_ID, intIn, noteId, problems, summary, type BoxKey, type Draft, type Problem } from './checks'
import { ArrowIcon, Chip, Page, SheetHeader, cx } from './ui'
import a from './App.module.css'
import s from './Form.module.css'

interface FormProps {
  flow: Flow
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  onBack: () => void
  onSubmit: () => void
  titleRef: Ref<HTMLHeadingElement>
  /** the user already has a justificante: this one corrects it */
  complementary: boolean
}

// Page 2: the form. Four fieldsets (A–D) with numbered boxes, two boxes the
// application fills in (07, 08), the declaration and the submit.
export default function Form({ flow, draft, setDraft, onBack, onSubmit, titleRef, complementary }: FormProps) {
  const uid = useId()
  const list = problems(flow, draft)
  // a wrong value is flagged at once; a blank one once the user tries to present
  const flag = (box: BoxKey): Problem | undefined => {
    const p = list.find((x) => x.box === box)
    return p && (p.kind === 'invalid' || draft.attempted) ? p : undefined
  }
  const describe = (box: BoxKey, extra?: string) =>
    [flag(box) ? noteId(box) : '', extra ?? ''].filter(Boolean).join(' ') || undefined

  const setAdults = (text: string) => {
    setDraft((d) => ({ ...d, adults: text }))
    const n = intIn(text, LIMITS.adults.min, LIMITS.adults.max)
    if (n !== null) flow.set('adults', n)
  }
  const setChildren = (text: string) => {
    setDraft((d) => ({ ...d, children: text }))
    const n = text === '' ? 0 : intIn(text, LIMITS.children.min, LIMITS.children.max)
    if (n !== null) flow.set('children', n)
  }
  const setGuess = (text: string) => {
    setDraft((d) => ({ ...d, guess: text }))
    const n = intIn(text, LIMITS.perceived.min, LIMITS.perceived.max)
    if (n !== null) flow.set('perceivedPercentile', n)
  }

  const householdOk =
    intIn(draft.adults, LIMITS.adults.min, LIMITS.adults.max) !== null &&
    (draft.children.trim() === '' || intIn(draft.children, LIMITS.children.min, LIMITS.children.max) !== null)
  const guess = intIn(draft.guess, LIMITS.perceived.min, LIMITS.perceived.max)
  const p01 = flag('01')
  const p02 = flag('02')
  const warning = flow.income.state === 'warning'
  const code = flow.municipality?.mun_code ?? ''
  const munLabelLength = flow.municipality ? flow.municipality.mun_name.length + flow.municipality.prov_name.length : 0

  // The combobox is shared and headless: hang its invalid state and its note
  // on the input directly.
  useEffect(() => {
    const el = document.getElementById(FIELD_ID['01'])
    if (!el) return
    if (p01) {
      el.setAttribute('aria-invalid', 'true')
      el.setAttribute('aria-describedby', noteId('01'))
    } else {
      el.removeAttribute('aria-invalid')
      el.removeAttribute('aria-describedby')
    }
  }, [p01])

  const summaryId = `${uid}-resumen`
  const status = complementary ? 'Declaración complementaria' : 'Borrador sin presentar'

  return (
    <Page
      strip={`Ejemplar para el interesado · Compara tu ingreso · Ejercicio ${YEAR}`}
      stripShort={`Ejemplar para el interesado · Ejercicio ${YEAR}`}
    >
      <form
        className={cx(a.sheet, a.fill)}
        noValidate
        aria-labelledby={`${uid}-title`}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <SheetHeader
          titleId={`${uid}-title`}
          titleRef={titleRef}
          title="Declaración de la posición de renta del hogar"
          sub={`Ejercicio ${YEAR}`}
          phoneSub={`Pág. 2 de 2 · ${status}`}
          aside={
            <>
              <span>Pág. 2 de 2</span>
              <span>{status}</span>
            </>
          }
        />

        <div className={s.grid}>
          {/* ---- A · Domicilio ---- */}
          <fieldset className={cx(s.set, s.setLeft)}>
            <legend className={s.legend}>A · Domicilio</legend>
            <div className={cx(s.fields, s.fieldsA)}>
              <Field box="01" label="Municipio de residencia" labelId={`${uid}-l01`} htmlFor={FIELD_ID['01']} problem={p01}>
                <div className={cx(s.box, s.munBox, p01 && s.boxInvalid)}>
                  <MunicipalitySearch
                    label="Municipio de residencia"
                    labelledBy={`${uid}-l01`}
                    inputId={FIELD_ID['01']}
                    value={flow.answers.municipality}
                    onChange={(c) => flow.set('municipality', c)}
                    placeholder="Escriba su municipio…"
                    maxResults={7}
                    classes={{
                      root: s.munRoot,
                      input: cx(
                        s.input,
                        s.munInput,
                        munLabelLength > 26 && s.munInputLong,
                        munLabelLength > 44 && s.munInputLonger
                      ),
                      list: s.munList,
                      option: s.munOption,
                      optionActive: s.munOptionActive,
                      name: s.munName,
                      meta: s.munMeta,
                      status: s.munStatus,
                    }}
                  />
                  <svg className={s.chevron} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                    <path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </Field>
              <div className={s.field}>
                <span className={s.labelPlain} id={`${uid}-ine`}>
                  Código INE
                </span>
                <p className={s.ine} aria-labelledby={`${uid}-ine`}>
                  {code ? (
                    <span key={code} className={s.ineCode}>
                      {code}
                    </span>
                  ) : (
                    <>
                      <span className={s.inePlaceholder} aria-hidden="true">
                        _____
                      </span>
                      <span className={a.srOnly}>Sin consignar</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <Instruction>
              Escriba las primeras letras y elija su municipio en la lista. El código INE se consigna de oficio.
            </Instruction>
          </fieldset>

          {/* ---- B · Ingresos del hogar ---- */}
          <fieldset className={s.set}>
            <legend className={s.legend}>B · Ingresos del hogar</legend>
            <div className={cx(s.fields, s.fieldsB)}>
              <Field
                box="02"
                label="Ingresos netos al mes, de todo el hogar"
                srExtra=", en euros"
                htmlFor={FIELD_ID['02']}
                problem={p02}
                after={
                  warning && !p02 ? (
                    <p id={`${FIELD_ID['02']}-aviso`} className={s.warn}>
                      Aviso: importe elevado. Compruebe que es mensual y no anual.
                    </p>
                  ) : null
                }
              >
                <IncomeInput flow={flow} invalid={!!p02} describedBy={describe('02', warning ? `${FIELD_ID['02']}-aviso` : '')} />
              </Field>
              <fieldset className={cx(s.field, s.subSet)}>
                <legend className={s.label}>
                  <Chip>03</Chip> <span>Pagas al año</span>
                </legend>
                <div className={cx(s.box, s.xRow)}>
                  {([12, 14] as const).map((n) => (
                    <label key={n} className={s.xOption}>
                      <span className={s.xWrap}>
                        <input
                          type="radio"
                          name={`${uid}-pagas`}
                          value={n}
                          checked={flow.answers.paymentPeriods === n}
                          onChange={() => flow.set('paymentPeriods', n)}
                          className={s.xInput}
                          aria-label={`${n} pagas`}
                        />
                        <span className={s.xBox} aria-hidden="true" />
                      </span>
                      <span className={s.xText} aria-hidden="true">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <Computed box="07" label="Total anual (02 × 03), lo calcula la aplicación">
              {flow.annualIncome !== null ? amount(flow.annualIncome) : '—'}
            </Computed>
            <Instruction>
              Sume lo que entra cada mes en el hogar, ya descontados impuestos y cotizaciones: nóminas, pensiones,
              prestaciones y otras rentas de todas las personas. Si cobra pagas extra, marque 14.
            </Instruction>
          </fieldset>

          {/* ---- C · Composición del hogar ---- */}
          <fieldset className={cx(s.set, s.setLeft)}>
            <legend className={s.legend}>C · Composición del hogar</legend>
            <div className={cx(s.fields, s.fieldsC)}>
              <Field box="04" label="Personas de 14 años o más" htmlFor={FIELD_ID['04']} problem={flag('04')}>
                <CountInput
                  id={FIELD_ID['04']}
                  value={draft.adults}
                  onText={setAdults}
                  min={LIMITS.adults.min}
                  max={LIMITS.adults.max}
                  start={1}
                  invalid={!!flag('04')}
                  describedBy={describe('04')}
                />
              </Field>
              <Field box="05" label="Menores de 14 años" htmlFor={FIELD_ID['05']} problem={flag('05')}>
                <CountInput
                  id={FIELD_ID['05']}
                  value={draft.children}
                  onText={setChildren}
                  onBlur={() => draft.children.trim() === '' && setChildren('0')}
                  min={LIMITS.children.min}
                  max={LIMITS.children.max}
                  start={0}
                  invalid={!!flag('05')}
                  describedBy={describe('05')}
                />
              </Field>
            </div>
            <Computed box="08" label="Unidades de consumo (escala OCDE: 1 + 0,5 por adulto más + 0,3 por menor)">
              {householdOk ? unitsSum(flow.answers.adults, flow.answers.children) : '—'}
            </Computed>
            <Instruction>
              Cuente a todas las personas que viven en el hogar, usted incluido. La escala pondera a cada persona para
              comparar hogares de distinto tamaño.
            </Instruction>
          </fieldset>

          {/* ---- D · Su estimación ---- */}
          <fieldset className={s.set}>
            <legend className={s.legend}>D · Su estimación</legend>
            <div className={cx(s.fields, s.fieldsD)}>
              <Field
                box="06"
                label="¿Qué porcentaje de la población cree que vive en hogares con menos ingresos que el suyo?"
                htmlFor={FIELD_ID['06']}
                problem={flag('06')}
                wide
              >
                <div className={s.guessRow}>
                  <div className={cx(s.box, s.guessBox, flag('06') && s.boxInvalid)}>
                    <CountInput
                      id={FIELD_ID['06']}
                      value={draft.guess}
                      onText={setGuess}
                      min={LIMITS.perceived.min}
                      max={LIMITS.perceived.max}
                      start={50}
                      invalid={!!flag('06')}
                      describedBy={describe('06')}
                      bare
                    />
                    <span className={s.unit} aria-hidden="true">
                      %
                    </span>
                  </div>
                  <Ruler value={guess} onChange={(v) => setGuess(String(v))} />
                </div>
              </Field>
            </div>
            <Instruction>
              Imagine a toda la población de España ordenada de menos a más ingresos. ¿Qué porcentaje quedaría por
              debajo de su hogar? Marque una × en la regla o escriba la cifra.
            </Instruction>
          </fieldset>

          {/* ---- Declaration and submit ---- */}
          <div className={s.submitRow}>
            <div className={s.declareWrap}>
              <label className={s.declare}>
                <span className={cx(s.xWrap, s.xWrapLarge)}>
                  <input
                    id={FIELD_ID.decl}
                    type="checkbox"
                    className={s.xInput}
                    checked={draft.declared}
                    onChange={(e) => {
                      const declared = e.target.checked
                      setDraft((d) => ({ ...d, declared }))
                    }}
                    aria-invalid={flag('decl') ? true : undefined}
                    aria-describedby={describe('decl')}
                  />
                  <span className={s.xBox} aria-hidden="true" />
                </span>
                <span>Declaro que los datos consignados son, a mi leal saber, aproximadamente ciertos.</span>
              </label>
              {flag('decl') && (
                <p id={noteId('decl')} className={s.note}>
                  {flag('decl')!.message}
                </p>
              )}
            </div>
            <div className={s.submitSide}>
              <div className={s.actions}>
                <button type="button" className={cx(a.btn, s.back)} onClick={onBack}>
                  Volver
                </button>
                <button type="submit" className={cx(a.btn, a.btnPrimary, s.submit)} aria-describedby={summaryId}>
                  Presentar declaración
                  <ArrowIcon size={18} />
                </button>
              </div>
              <p
                id={summaryId}
                className={cx(s.summary, list.length > 0 && draft.attempted && s.summaryBad, list.length === 0 && s.summaryOk)}
              >
                {summary(list)}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Page>
  )
}

// ---- Parts -------------------------------------------------------------------

interface FieldProps {
  box: string
  label: string
  /** read by screen readers only, after the label */
  srExtra?: string
  htmlFor: string
  labelId?: string
  problem?: Problem
  after?: ReactNode
  wide?: boolean
  children: ReactNode
}

/** A numbered box: chip + printed label, the control, and its note. */
function Field({ box, label, srExtra, htmlFor, labelId, problem, after, wide, children }: FieldProps) {
  return (
    <div className={cx(s.field, wide && s.fieldWide)}>
      <label id={labelId} htmlFor={htmlFor} className={s.label}>
        <Chip>{box}</Chip>{' '}
        <span>
          {label}
          {srExtra && <span className={a.srOnly}>{srExtra}</span>}
        </span>
      </label>
      {children}
      {problem && (
        <p id={noteId(problem.box)} className={s.note}>
          {problem.message}
        </p>
      )}
      {after}
    </div>
  )
}

/** A hatched box "que calcula la aplicación". */
function Computed({ box, label, children }: { box: string; label: string; children: ReactNode }) {
  return (
    <div className={s.computed}>
      <span className={s.computedLabel}>
        <span className={s.computedBox}>{box}</span> · {label}
      </span>
      <span className={s.computedValue}>{children}</span>
    </div>
  )
}

function Instruction({ children }: { children: ReactNode }) {
  return (
    <p className={s.instruction}>
      <span className={s.instructionTag}>Instrucciones</span>
      {children}
    </p>
  )
}

/** Box 02: typed freely while focused ("3200,5"), printed "3.200,50" otherwise. */
function IncomeInput({ flow, invalid, describedBy }: { flow: Flow; invalid: boolean; describedBy?: string }) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')
  const value = flow.answers.monthlyIncome
  const shown = focused ? text : value === '' ? '' : num(value, 2)
  return (
    <div className={cx(s.box, invalid && s.boxInvalid)}>
      <input
        id={FIELD_ID['02']}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        className={cx(s.input, s.inputRight)}
        placeholder="0,00"
        value={shown}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onFocus={() => {
          setText(editableAmount(value))
          setFocused(true)
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '').slice(0, 12)
          setText(t)
          flow.set('monthlyIncome', parseAmount(t))
        }}
      />
      <span className={s.unit} aria-hidden="true">
        €
      </span>
    </div>
  )
}

interface CountInputProps {
  id: string
  value: string
  onText: (text: string) => void
  onBlur?: () => void
  min: number
  max: number
  /** where the arrow keys start from on an empty box */
  start: number
  invalid: boolean
  describedBy?: string
  /** no box of its own (06 sits in a box with its % sign) */
  bare?: boolean
}

/** A small typed number box; ↑/↓ step within its range. */
function CountInput({ id, value, onText, onBlur, min, max, start, invalid, describedBy, bare }: CountInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      maxLength={2}
      className={cx(s.input, bare ? s.inputBare : s.inputBoxed, !bare && invalid && s.boxInvalid)}
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onBlur={onBlur}
      onChange={(e) => onText(e.target.value.replace(/\D/g, '').slice(0, 2))}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        const current = /^\d+$/.test(value) ? Number(value) : null
        const next = current === null ? start : current + (e.key === 'ArrowUp' ? 1 : -1)
        onText(String(Math.min(max, Math.max(min, next))))
      }}
    />
  )
}

const TICKS = Array.from({ length: 21 }, (_, i) => i)

/**
 * Box 06's ruler, 0–100. A real range input (keyboard, screen readers) under a
 * drawn ruler; pointer drags are handled on the ruler so a tap anywhere marks
 * it, on every browser.
 */
function Ruler({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const area = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const dragging = useRef(false)

  const at = (clientX: number) => {
    const r = area.current?.getBoundingClientRect()
    if (!r || r.width === 0) return 50
    return Math.min(99, Math.max(1, Math.round(((clientX - r.left) / r.width) * 100)))
  }

  return (
    <div
      className={s.ruler}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        dragging.current = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        input.current?.focus({ preventScroll: true })
        onChange(at(e.clientX))
      }}
      onPointerMove={(e) => {
        if (dragging.current) onChange(at(e.clientX))
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
    >
      <input
        ref={input}
        type="range"
        min={1}
        max={99}
        step={1}
        value={value ?? 50}
        className={s.range}
        aria-label="Casilla 06 en la regla: porcentaje de la población por debajo de su hogar"
        aria-valuetext={value === null ? 'Sin marcar' : `${value} %`}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => {
          // the first arrow press on an empty ruler marks the middle
          if (value === null && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault()
            onChange(50)
          }
        }}
      />
      <div ref={area} className={s.rulerDraw} aria-hidden="true">
        <span className={s.rulerLine} />
        <span className={s.rulerTicks}>
          {TICKS.map((t) => (
            <span key={t} className={cx(s.tick, t % 2 === 0 && s.tickLong)} />
          ))}
        </span>
        <span className={cx(s.rulerNum, s.rulerNumStart)}>0</span>
        <span className={cx(s.rulerNum, s.rulerNumMid)}>50</span>
        <span className={cx(s.rulerNum, s.rulerNumEnd)}>100</span>
        {value !== null && (
          <span className={s.mark} style={{ left: `${value}%` }}>
            ×
          </span>
        )}
      </div>
    </div>
  )
}
