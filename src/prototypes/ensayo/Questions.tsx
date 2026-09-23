'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import MunicipalitySearch from '@/prototypes/shared/MunicipalitySearch'
import { LIMITS, type Flow } from '@/prototypes/shared/useFlow'
import { euro, naturalName, num, scaleExplained } from '@/prototypes/shared/format'
import GuessPicker from './GuessPicker'
import Sidenote from './Sidenote'
import { cx, unitsText } from './copy'
import a from './App.module.css'
import q from './Questions.module.css'

const TOPICS = ['Municipio', 'Ingresos', 'Hogar', 'Tu estimación']

interface QuestionsProps {
  flow: Flow
  step: number
  onStep: (n: number) => void
  guessTouched: boolean
  onGuess: (n: number) => void
  onCalculate: () => void
  /** an error from the calculation, shown under the last question */
  error: string | null
}

export default function Questions({ flow, step, onStep, guessTouched, onGuess, onCalculate, error }: QuestionsProps) {
  const [attempted, setAttempted] = useState<boolean[]>([false, false, false, false])
  const [direction, setDirection] = useState<1 | -1>(1)
  const body = useRef<HTMLDivElement>(null)
  // focus the new step's main control after the user moves, never on first paint
  const moved = useRef(false)

  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    const el = body.current?.querySelector<HTMLElement>('[data-main]') ?? body.current?.querySelector('input')
    el?.focus({ preventScroll: true })
    const panel = body.current?.closest('form')
    if (panel) {
      const r = panel.getBoundingClientRect()
      if (r.top < 0 || r.top > window.innerHeight * 0.4) {
        const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        panel.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' })
      }
    }
  }, [step])

  const incomeOk = flow.income.state === 'valid' || flow.income.state === 'warning'
  const valid = [!!flow.municipality, incomeOk, true, guessTouched]

  const go = (n: number) => {
    moved.current = true
    setDirection(n > step ? 1 : -1)
    onStep(n)
  }

  const next = () => {
    if (!valid[step]) {
      setAttempted((t) => t.map((v, i) => (i === step ? true : v)))
      ;(body.current?.querySelector<HTMLElement>('[data-main]') ?? body.current?.querySelector('input'))?.focus()
      return
    }
    if (step < 3) go(step + 1)
    else onCalculate()
  }

  const shown = attempted[step]

  return (
    <form
      className={q.panel}
      noValidate
      aria-labelledby="ensayo-q-title"
      onSubmit={(e) => {
        e.preventDefault()
        next()
      }}
    >
      <div className={q.head}>
        <p className={q.count} id="ensayo-q-count">
          Pregunta {step + 1} de 4<span className={q.countTopic}> · {TOPICS[step]}</span>
        </p>
        <ol className={q.progress} aria-hidden="true">
          {TOPICS.map((t, i) => (
            <li key={t} className={cx(q.seg, i < step && q.segDone, i === step && q.segNow)}>
              <span className={q.segLabel}>{t}</span>
            </li>
          ))}
        </ol>
      </div>

      <div ref={body} key={step} className={cx(q.body, direction === -1 && q.bodyBack)}>
        {step === 0 && <StepPlace flow={flow} attempted={shown} />}
        {step === 1 && <StepIncome flow={flow} attempted={shown} />}
        {step === 2 && <StepHousehold flow={flow} />}
        {step === 3 && (
          <>
            <h3 className={q.qTitle} id="ensayo-q-title">
              Si España fuera 100 personas ordenadas de menos a más ingresos, ¿cuál crees que serías tú?
            </h3>
            <GuessPicker
              value={flow.answers.perceivedPercentile}
              touched={guessTouched}
              attempted={shown}
              onPick={onGuess}
              labelledBy="ensayo-q-title"
            />
          </>
        )}
      </div>

      {error && step === 3 && (
        <div className={q.error} role="alert">
          <p>
            <strong>No hemos podido hacer las cuentas.</strong> {error}
          </p>
          <button type="button" className={cx(a.btn, a.btnSecondary)} onClick={onCalculate}>
            Reintentar
          </button>
        </div>
      )}

      <div className={q.foot}>
        {step > 0 ? (
          <button type="button" className={cx(a.btn, a.btnQuiet)} onClick={() => go(step - 1)}>
            <span className={cx(a.btnArrow, a.btnArrowBack)} aria-hidden="true">
              ←
            </span>
            Anterior
          </button>
        ) : (
          <span />
        )}
        <span className={q.enter} aria-hidden="true">
          o pulsa Intro ↵
        </span>
        <button type="submit" className={a.btn} aria-describedby="ensayo-q-count">
          {step === 3 ? 'Ver dónde estoy' : 'Siguiente'}
          <span className={a.btnArrow} aria-hidden="true">
            {step === 3 ? '↓' : '→'}
          </span>
        </button>
      </div>
    </form>
  )
}

/* ---- 1 · municipality ---- */

function StepPlace({ flow, attempted }: { flow: Flow; attempted: boolean }) {
  const m = flow.municipality
  return (
    <>
      <h3 className={q.qTitle} id="ensayo-q-title">
        ¿En qué municipio vives?
      </h3>
      <p className={q.hint} id="ensayo-q-hint">
        Escribe las primeras letras y elige tu municipio de la lista.
      </p>
      <div className={q.comboWrap}>
        <MunicipalitySearch
          label="Municipio"
          labelledBy="ensayo-q-title"
          inputId="ensayo-municipio"
          value={flow.answers.municipality}
          onChange={(code) => flow.set('municipality', code)}
          placeholder="Por ejemplo, Zaragoza"
          classes={{
            root: q.combo,
            input: q.comboInput,
            list: q.comboList,
            option: q.comboOption,
            optionActive: q.comboActive,
            name: q.comboName,
            meta: q.comboMeta,
            status: q.comboStatus,
          }}
        />
      </div>
      {m ? (
        <p className={q.confirm}>
          Te compararemos con España, con la provincia de {naturalName(m.prov_name)} y con el municipio de{' '}
          {naturalName(m.mun_name)}.
        </p>
      ) : (
        attempted && (
          <p className={cx(q.msg, q.msgError)} role="alert">
            Elige tu municipio de la lista para seguir.
          </p>
        )
      )}
    </>
  )
}

/* ---- 2 · income ---- */

function StepIncome({ flow, attempted }: { flow: Flow; attempted: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const mirror = useRef<HTMLSpanElement>(null)
  const caret = useRef<number | null>(null)
  const [width, setWidth] = useState<number | null>(null)
  const value = flow.answers.monthlyIncome
  const text = typeof value === 'number' ? num(value) : ''
  const periods = flow.answers.paymentPeriods

  // keep the caret after the same digit when the thousands dots move
  useLayoutEffect(() => {
    const el = input.current
    if (caret.current === null || !el) return
    let seen = 0
    let i = 0
    while (i < el.value.length && seen < caret.current) {
      if (/\d/.test(el.value[i])) seen++
      i++
    }
    el.setSelectionRange(i, i)
    caret.current = null
  })

  // the field is exactly as wide as its figure, so "€" follows it
  useLayoutEffect(() => {
    const m = mirror.current
    if (!m) return
    const fit = () => setWidth(Math.ceil(m.getBoundingClientRect().width) + 4)
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(m)
    return () => ro.disconnect()
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const at = e.target.selectionStart ?? raw.length
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6)
    caret.current = raw.slice(0, at).replace(/\D/g, '').replace(/^0+/, '').length
    flow.set('monthlyIncome', digits ? Number(digits) : '')
  }

  const v = flow.income
  const clean = (message: string) => message.replace(/^[^\p{L}\p{N}]+/u, '')
  const message =
    v.state === 'invalid' || v.state === 'warning'
      ? { text: clean(v.message), error: v.state === 'invalid' }
      : v.state === 'empty' && attempted
        ? { text: 'Escribe cuánto dinero entra en tu hogar cada mes.', error: true }
        : null

  return (
    <>
      <h3 className={q.qTitle}>
        <label htmlFor="ensayo-ingresos" id="ensayo-q-title">
          ¿Cuánto dinero entra en tu hogar cada mes?
        </label>
      </h3>
      <p className={q.hint} id="ensayo-ingresos-hint">
        En neto, después de impuestos, y sumando lo de todas las personas que viven contigo: nóminas, pensiones,
        prestaciones, alquileres…
      </p>

      <div className={q.moneyRow}>
        <span className={q.money}>
          <span ref={mirror} className={cx(q.moneyInput, q.moneyMirror)} aria-hidden="true">
            {text || '0'}
          </span>
          <input
            ref={input}
            id="ensayo-ingresos"
            data-main=""
            className={q.moneyInput}
            style={width ? { width } : undefined}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={text}
            onChange={onChange}
            aria-invalid={v.state === 'invalid' || undefined}
            aria-describedby={`ensayo-ingresos-hint ensayo-ingresos-year${message ? ' ensayo-ingresos-msg' : ''}`}
          />
          <span className={q.moneyUnit} aria-hidden="true">
            €
          </span>
        </span>
        <span className={q.moneyPer}>al mes</span>
      </div>

      <div className={q.pagasRow}>
        <div className={q.seg2} role="group" aria-label="Pagas al año">
          {([12, 14] as const).map((p) => (
            <button
              type="button"
              key={p}
              className={q.seg2Btn}
              aria-pressed={periods === p}
              onClick={() => flow.set('paymentPeriods', p)}
            >
              {p} pagas
            </button>
          ))}
        </div>
        <p className={q.annual} id="ensayo-ingresos-year">
          {flow.annualIncome !== null ? (
            <>
              <span className={q.annualOp}>=</span> {euro(flow.annualIncome)} al año
            </>
          ) : (
            <>
              <span className={q.annualOp}>=</span> … € al año
            </>
          )}
        </p>
      </div>

      <p className={q.aside}>
        Si cobras en 14 pagas, escribe lo que entra un mes normal: contaremos las dos extras.
        <Sidenote n={4} title="¿Por qué las pagas?">
          En España muchas nóminas se cobran en 14 pagas: dos meses al año entra el doble. Para calcular lo que entra
          en casa al año multiplicamos por 14 en lugar de por 12.
        </Sidenote>
      </p>

      {message && (
        <p
          id="ensayo-ingresos-msg"
          className={cx(q.msg, message.error ? q.msgError : q.msgWarn)}
          role={message.error ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </>
  )
}

/* ---- 3 · household ---- */

function StepHousehold({ flow }: { flow: Flow }) {
  const { adults, children } = flow.answers
  const parts = [
    { w: 1, label: '1', child: false },
    ...Array.from({ length: adults - 1 }, () => ({ w: 0.5, label: '0,5', child: false })),
    ...Array.from({ length: children }, () => ({ w: 0.3, label: '0,3', child: true })),
  ]
  // one block per person, as wide as what they count for
  const unitPx = Math.min(64, 300 / flow.units)
  return (
    <>
      <h3 className={q.qTitle} id="ensayo-q-title">
        ¿Cuántas personas viven en tu hogar?
      </h3>
      <p className={q.hint}>Contándote a ti.</p>

      <div className={q.steppers}>
        <Stepper
          id="ensayo-adultos"
          label="De 14 años o más"
          noun="persona de 14 años o más"
          value={adults}
          min={LIMITS.adults.min}
          max={LIMITS.adults.max}
          onChange={(n) => flow.set('adults', n)}
          main
        />
        <Stepper
          id="ensayo-menores"
          label="Menores de 14"
          noun="persona menor de 14 años"
          value={children}
          min={LIMITS.children.min}
          max={LIMITS.children.max}
          onChange={(n) => flow.set('children', n)}
        />
      </div>

      <div className={q.units}>
        <div className={q.unitsFig} aria-hidden="true">
          <div className={q.unitsBar}>
            {parts.map((p, i) => (
              <span key={i} className={cx(q.unit, p.child && q.unitChild)} style={{ width: p.w * unitPx }}>
                {p.w * unitPx >= 24 && <span className={q.unitLabel}>{p.label}</span>}
              </span>
            ))}
          </div>
        </div>
        <p className={q.unitsText}>
          Tu hogar cuenta como <strong>{scaleExplained(adults, children)}</strong>.
          <Sidenote n={5} title="¿Qué es una unidad de consumo?">
            Un hogar de cuatro personas no necesita cuatro veces lo que uno de una: se comparten la casa, la cocina, la
            luz. La escala de la OCDE modificada lo tiene en cuenta: la primera persona cuenta 1; cada otra de 14 años
            o más, 0,5; cada menor de 14, 0,3. Dividimos los ingresos del hogar entre esa suma.
          </Sidenote>{' '}
          {flow.annualIncome !== null && flow.equivIncome !== null && (
            <>
              {flow.units === 1 ? (
                <>Así que tus {euro(flow.annualIncome)} al año son </>
              ) : (
                <>
                  Así, {euro(flow.annualIncome)} al año entre {unitsText(flow.units)} son{' '}
                </>
              )}
              <strong className={q.equiv}>{euro(flow.equivIncome)} por unidad de consumo</strong>: la cifra que vamos a
              comparar con la del resto de España.
            </>
          )}
        </p>
      </div>
    </>
  )
}

interface StepperProps {
  id: string
  label: string
  noun: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  main?: boolean
}

function Stepper({ id, label, noun, value, min, max, onChange, main }: StepperProps) {
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
          disabled={value <= min}
          onClick={() => step(-1)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <path d="M1 7h12" stroke="currentColor" strokeWidth="1.6" />
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
          onFocus={(e) => e.currentTarget.select()}
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
          disabled={value >= max}
          onClick={() => step(1)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <path d="M1 7h12M7 1v12" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
