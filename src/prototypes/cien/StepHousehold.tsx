'use client'

import { useEffect, useState } from 'react'
import { euro, scaleExplained } from '@/prototypes/shared/format'
import { LIMITS, type Flow } from '@/prototypes/shared/useFlow'
import { cx } from './ui'
import { unitsText } from './copy'
import q from './Question.module.css'

export default function StepHousehold({ flow }: { flow: Flow }) {
  const { adults, children } = flow.answers
  const units = flow.units
  // one bar per person, as wide as what they count for: 1, 0,5, 0,3
  const parts = [
    { w: 1, label: '1', child: false },
    ...Array.from({ length: adults - 1 }, () => ({ w: 0.5, label: '0,5', child: false })),
    ...Array.from({ length: children }, () => ({ w: 0.3, label: '0,3', child: true })),
  ]
  const barWidth = { width: `min(100%, ${Math.round(units * 150)}px)` }

  return (
    <>
      <div className={q.hhHead}>
        <h1 className={cx(q.title, q.titleWide)}>¿Cuántas personas viven en casa?</h1>
        <p className={q.hint}>Contándote a ti.</p>
      </div>

      <div className={q.steppers}>
        <Stepper
          id="cien-adultos"
          label="14 años o más"
          noun="persona de 14 años o más"
          value={adults}
          min={LIMITS.adults.min}
          max={LIMITS.adults.max}
          onChange={(n) => flow.set('adults', n)}
          main
        />
        <Stepper
          id="cien-menores"
          label="Menores de 14"
          noun="persona menor de 14 años"
          value={children}
          min={LIMITS.children.min}
          max={LIMITS.children.max}
          onChange={(n) => flow.set('children', n)}
        />
      </div>

      <div className={q.units}>
        <div aria-hidden="true">
          <p className={q.unitsHead}>Unidades de consumo</p>
          <div className={q.unitsBar} style={barWidth}>
            {parts.map((p, i) => (
              <span key={i} className={cx(q.unit, p.child && q.unitChild)} style={{ flexGrow: p.w }} />
            ))}
          </div>
          <div className={q.unitsScale} style={barWidth}>
            {parts.map((p, i) => (
              <span key={i} className={q.unitLabel} style={{ flexGrow: p.w }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
        <p className={q.unitsText}>
          Para comparar hogares de distinto tamaño, tu hogar cuenta como{' '}
          <strong>{scaleExplained(adults, children)}</strong>: la primera persona cuenta 1; cada otra persona de 14
          años o más, 0,5; cada menor de 14, 0,3.
        </p>
        {flow.annualIncome !== null && flow.equivIncome !== null && (
          <p className={q.equation}>
            <span className={q.eqTerm}>{euro(flow.annualIncome)}</span>
            <span className={q.eqOp}>÷</span>
            <span className={q.eqTerm}>{unitsText(units)}</span>
            <span className={q.eqOp}>=</span>
            <span className={q.eqTerm}>{euro(flow.equivIncome)}</span>
            <span className={q.eqUnit}>al año por unidad de consumo: la cifra que vamos a comparar</span>
          </p>
        )}
      </div>
    </>
  )
}

interface StepperProps {
  id: string
  label: string
  /** for the buttons' names: "Añadir una persona de 14 años o más" */
  noun: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  main?: boolean
}

function Stepper({ id, label, noun, value, min, max, onChange, main }: StepperProps) {
  // the field can be empty while typing; it settles on blur
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const step = (d: number) => {
    const n = clamp(value + d)
    if (n !== value) onChange(n)
  }

  return (
    <div className={q.stepper}>
      <label htmlFor={id} className={q.stepperLabel}>
        {label}
      </label>
      <div className={q.stepperRow}>
        <button
          type="button"
          className={q.stepBtn}
          aria-label={`Quitar una ${noun}`}
          aria-controls={id}
          aria-disabled={value <= min || undefined}
          onClick={() => step(-1)}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
            <path d="M3 13h20" stroke="currentColor" strokeWidth="3.4" />
          </svg>
        </button>
        <input
          id={id}
          data-main={main ? '' : undefined}
          className={q.stepNum}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          autoComplete="off"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          value={draft}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
            setDraft(digits)
            if (digits) onChange(clamp(Number(digits)))
          }}
          onBlur={() => setDraft(String(value))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              step(1)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              step(-1)
            }
          }}
        />
        <button
          type="button"
          className={q.stepBtn}
          aria-label={`Añadir una ${noun}`}
          aria-controls={id}
          aria-disabled={value >= max || undefined}
          onClick={() => step(1)}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
            <path d="M3 13h20M13 3v20" stroke="currentColor" strokeWidth="3.4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
