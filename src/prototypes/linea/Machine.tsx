'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { loadNationalPercentiles } from '@/lib/dataLoader'
import MunicipalitySearch from '../shared/MunicipalitySearch'
import { LIMITS, type Flow } from '../shared/useFlow'
import { euro, num, scaleExplained } from '../shared/format'
import Brand from './Brand'
import { useIsoLayoutEffect } from './hooks'
import { cx, stopPosition } from './network'
import { ArrowIcon, BackspaceIcon, MinusIcon, PlusIcon, SearchIcon, StopIcon, WarningIcon } from './Icons'
import s from './Machine.module.css'

const SIGN_STATIONS = [
  { p: 99, long: 'Percentil 99', short: 'P99' },
  { p: 90, long: 'Percentil 90', short: 'P90' },
  { p: 75, long: 'Percentil 75', short: 'P75' },
  { p: 50, long: 'Mediana', short: 'Mediana' },
  { p: 25, long: 'Percentil 25', short: 'P25' },
  { p: 10, long: 'Percentil 10', short: 'P10' },
]

const MAX_DIGITS = 6

const KEYS: Array<{ key: string; label: string }> = [
  ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => ({ key: k, label: k })),
  { key: '00', label: 'Doble cero' },
  { key: '0', label: '0' },
  { key: 'back', label: 'Borrar la última cifra' },
]

/** National percentiles for the signage line (cached by dataLoader). */
function useNationalPercentiles(): number[] | null {
  const [values, setValues] = useState<number[] | null>(null)
  useEffect(() => {
    let alive = true
    loadNationalPercentiles()
      .then((v) => alive && setValues(v))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return values
}

/** The OECD sum, spelled out; compressed when the household is large. */
function scaleLine(adults: number, children: number): string {
  if (adults + children <= 7) return scaleExplained(adults, children)
  const units = 1 + (adults - 1) * 0.5 + children * 0.3
  const whole = Math.abs(units - Math.round(units)) < 1e-9
  const parts = ['1']
  if (adults > 1) parts.push(`${adults - 1} × 0,5`)
  if (children) parts.push(`${children} × 0,3`)
  return `${parts.join(' + ')} = ${num(units, whole ? 0 : 1)} unidades de consumo`
}

function joinY(items: string[]): string {
  if (items.length < 2) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

interface MachineProps {
  flow: Flow
  onSubmit: () => void
  onMethod: () => void
  /** move focus to the machine's heading (when coming back from a trip) */
  focusHeading: boolean
}

export default function Machine({ flow, onSubmit, onMethod, focusHeading }: MachineProps) {
  const uid = useId()
  const ids = {
    title: `${uid}-title`,
    machine: `${uid}-machine`,
    origin: `${uid}-origin`,
    originLabel: `${uid}-origin-label`,
    income: `${uid}-income`,
    caption: `${uid}-caption`,
    annual: `${uid}-annual`,
    incomeMsg: `${uid}-income-msg`,
    guess: `${uid}-guess`,
    guessOf: `${uid}-guess-of`,
    guessSentence: `${uid}-guess-sentence`,
    hint: `${uid}-hint`,
  }
  const { answers } = flow
  const national = useNationalPercentiles()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const incomeRef = useRef<HTMLInputElement>(null)
  const [nudge, setNudge] = useState(0)

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  /* ---- income: the display is a real input, the keypad writes into it ---- */
  const digits = typeof answers.monthlyIncome === 'number' ? String(answers.monthlyIncome) : ''
  const formatted = digits ? num(Number(digits)) : ''
  const caretDigits = useRef<number | null>(null)

  const setDigits = (raw: string) => {
    const clean = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS)
    flow.set('monthlyIncome', clean ? Number(clean) : '')
  }
  const press = (key: string) => {
    if (key === 'back') setDigits(digits.slice(0, -1))
    else setDigits(digits + key)
  }

  // keep the caret after the same digit when the thousands dots move
  useIsoLayoutEffect(() => {
    const el = incomeRef.current
    const n = caretDigits.current
    if (!el || n === null || document.activeElement !== el) return
    caretDigits.current = null
    let i = 0
    let seen = 0
    while (i < el.value.length && seen < n) {
      if (/\d/.test(el.value[i])) seen++
      i++
    }
    el.setSelectionRange(i, i)
  })

  const incomeState = flow.income.state
  const incomeMessage =
    incomeState === 'invalid' || incomeState === 'warning' ? flow.income.message.replace(/^⚠️\s*/u, '') : null
  const periods = answers.paymentPeriods
  const annualText =
    flow.annualIncome !== null
      ? periods === 14
        ? `${euro(Number(digits))} × 14 = ${euro(flow.annualIncome)} al año`
        : `${euro(flow.annualIncome)} al año`
      : 'Lo que entra cada mes, entre todos'

  /* ---- guess ---- */
  const guess = answers.perceivedPercentile
  const [guessDraft, setGuessDraft] = useState(String(guess))
  useEffect(() => setGuessDraft(String(guess)), [guess])
  const setGuess = (n: number) =>
    flow.set('perceivedPercentile', Math.min(LIMITS.perceived.max, Math.max(LIMITS.perceived.min, Math.round(n))))

  /* ---- ticket ---- */
  const missing: string[] = []
  if (!flow.municipality) missing.push('el origen')
  if (incomeState === 'empty') missing.push('los ingresos')
  else if (incomeState === 'invalid') missing.push('unos ingresos válidos')
  const ready = flow.canCalculate
  const plural = missing.length > 1 || /^(los|unos) /.test(missing[0] ?? '')
  const hint = ready
    ? 'Listo para imprimir'
    : missing.length
      ? `${plural ? 'Faltan' : 'Falta'} ${joinY(missing)}`
      : 'Cargando municipios…'

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (ready) {
      onSubmit()
      return
    }
    setNudge((n) => n + 1)
    if (!flow.municipality) document.getElementById(ids.origin)?.focus()
    else incomeRef.current?.focus()
  }

  return (
    <main className={s.screen}>
      {/* ------------------------------------------------------------ signage */}
      <section className={s.signage} aria-labelledby={ids.title}>
        <Brand size="lg" />
        <h1 id={ids.title} className={s.title}>
          ¿En qué parada de la renta te bajas?
        </h1>
        <p className={s.lede}>
          Todas las personas de España, ordenadas por la renta de su hogar, como las paradas de una línea. Saca tu
          billete y te decimos la tuya.
        </p>

        <div className={s.lineHead}>
          <span className={s.lineBadge}>L1</span>
          <span className={s.lineName}>Línea España ∙ 99 paradas</span>
        </div>

        {/* desktop: the line runs down the panel, P99 at the top */}
        <ol className={s.signV} aria-label="Algunas paradas de la línea España">
          {SIGN_STATIONS.map((st) => (
            <li key={st.p} className={s.signVStop}>
              <span className={s.signVDot} aria-hidden="true" />
              <span className={s.signVName}>{st.long}</span>
              <span className={s.signVValue}>{national ? euro(national[st.p - 1]) : '—'}</span>
            </li>
          ))}
        </ol>

        {/* phone and tablet: a schematic strip, P10 on the left */}
        <ol className={s.signH} aria-label="Algunas paradas de la línea España">
          {[...SIGN_STATIONS].reverse().map((st) => (
            <li key={st.p} className={s.signHStop}>
              <span className={s.signHName}>{st.short}</span>
              <span className={s.signHDot} aria-hidden="true" />
              <span className={s.signHValue}>{national ? euro(national[st.p - 1]) : '—'}</span>
            </li>
          ))}
        </ol>

        <p className={s.signNote}>
          Renta neta anual por unidad de consumo. Fuente: INE, Atlas de Distribución de Renta de los Hogares.{' '}
          <button type="button" className={s.linkButton} onClick={onMethod}>
            Cómo se calcula
          </button>
        </p>
      </section>

      {/* ------------------------------------------------------------ machine */}
      <form className={s.machine} aria-labelledby={ids.machine} onSubmit={submit} noValidate>
        <div className={s.machineHead}>
          <h2 id={ids.machine} ref={headingRef} tabIndex={-1} className={s.machineTitle}>
            Saca tu billete
          </h2>
          <span className={s.machineMeta}>4 datos ∙ sin registro</span>
        </div>

        <div className={s.steps}>
          {/* 1 ∙ Origen */}
          <div className={cx(s.card, s.areaOrigin)}>
            <label id={ids.originLabel} htmlFor={ids.origin} className={s.stepLabel}>
              <span className={s.num} aria-hidden="true">
                1
              </span>
              Origen<span className={s.srOnly}> (el municipio donde vive tu hogar)</span>
            </label>
            <div className={s.searchBox}>
              <SearchIcon className={s.searchIcon} />
              <MunicipalitySearch
                label="Origen (el municipio donde vive tu hogar)"
                labelledBy={ids.originLabel}
                inputId={ids.origin}
                value={answers.municipality}
                onChange={(code) => flow.set('municipality', code)}
                placeholder="Escribe tu municipio…"
                classes={{
                  root: s.searchRoot,
                  input: s.searchInput,
                  list: s.searchList,
                  option: s.searchOption,
                  optionActive: s.searchOptionActive,
                  name: s.searchName,
                  meta: s.searchMeta,
                  status: s.searchStatus,
                }}
              />
            </div>
          </div>

          {/* 2 ∙ Viajeros */}
          <div className={cx(s.card, s.areaTravellers)}>
            <fieldset className={s.fieldset}>
              <legend className={s.stepLabel}>
                <span className={s.num} aria-hidden="true">
                  2
                </span>
                Viajeros
              </legend>
              <Stepper
                name="Adultos"
                hint="14 años o más"
                value={answers.adults}
                min={LIMITS.adults.min}
                max={LIMITS.adults.max}
                units={['adulto', 'adultos']}
                minusLabel="Quitar un adulto"
                plusLabel="Añadir un adulto"
                onChange={(n) => flow.set('adults', n)}
              />
              <Stepper
                name="Niños"
                hint="Menores de 14 años"
                value={answers.children}
                min={LIMITS.children.min}
                max={LIMITS.children.max}
                units={['niño', 'niños']}
                minusLabel="Quitar un niño"
                plusLabel="Añadir un niño"
                onChange={(n) => flow.set('children', n)}
              />
            </fieldset>
            <p className={s.note}>
              Como en la escala de la OCDE: el primer adulto cuenta 1, cada adulto más 0,5 y cada niño 0,3.
            </p>
            <p className={s.scale} aria-live="polite">
              <span className={s.scaleTag}>Tu hogar cuenta</span>
              <span className={s.scaleValue}>
                {(() => {
                  // keep "= 1,8 unidades de consumo" together when the sum wraps
                  const line = scaleLine(answers.adults, answers.children)
                  const at = line.indexOf(' = ')
                  if (at < 0) return line
                  return (
                    <>
                      {line.slice(0, at)}{' '}
                      <span className={s.scaleTotal}>{line.slice(at + 1)}</span>
                    </>
                  )
                })()}
              </span>
            </p>
          </div>

          {/* 3 ∙ Ingresos */}
          <div className={cx(s.card, s.areaIncome)}>
            <label htmlFor={ids.income} className={s.stepLabel}>
              <span className={s.num} aria-hidden="true">
                3
              </span>
              Ingresos del hogar
            </label>
            <div className={cx(s.display, incomeState === 'invalid' && s.displayInvalid)}>
              <span id={ids.caption} className={s.displayCaption}>
                Netos al mes, todo el hogar
              </span>
              <span className={s.displayRow}>
                <input
                  ref={incomeRef}
                  id={ids.income}
                  className={s.displayInput}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0"
                  value={formatted}
                  aria-invalid={incomeState === 'invalid'}
                  aria-describedby={cx(ids.caption, ids.annual, incomeMessage && ids.incomeMsg)}
                  onChange={(e) => {
                    const el = e.target
                    const pos = el.selectionStart ?? el.value.length
                    caretDigits.current = el.value.slice(0, pos).replace(/\D/g, '').length
                    setDigits(el.value)
                  }}
                />
                <span className={s.displayEuro} aria-hidden="true">
                  €
                </span>
              </span>
              <span id={ids.annual} className={s.displayAnnual}>
                {annualText}
              </span>
            </div>

            {incomeMessage && (
              <p
                id={ids.incomeMsg}
                className={cx(s.msg, incomeState === 'invalid' ? s.msgError : s.msgWarn)}
                role={incomeState === 'invalid' ? 'alert' : 'status'}
              >
                {incomeState === 'invalid' ? <StopIcon className={s.msgIcon} /> : <WarningIcon className={s.msgIcon} />}
                <span>{incomeMessage}</span>
              </p>
            )}

            <div className={s.pagas} role="group" aria-label="Pagas al año">
              {([12, 14] as const).map((n) => (
                <button
                  type="button"
                  key={n}
                  aria-pressed={periods === n}
                  className={cx(s.paga, periods === n && s.pagaOn)}
                  onClick={() => flow.set('paymentPeriods', n)}
                >
                  {n} pagas
                </button>
              ))}
            </div>
            {periods === 14 && (
              <p className={s.note}>Con 14 pagas, escribe lo que entra un mes normal, sin contar la extra.</p>
            )}

            <div className={s.keypad} role="group" aria-label="Teclado numérico">
              {KEYS.map((k) => (
                <button
                  type="button"
                  key={k.key}
                  className={cx(s.key, k.key === 'back' && s.keyBack)}
                  aria-label={k.label}
                  aria-controls={ids.income}
                  onClick={() => press(k.key)}
                >
                  {k.key === 'back' ? <BackspaceIcon /> : k.key}
                </button>
              ))}
            </div>

            <div className={s.preview}>
              <span className={s.previewText}>
                <span className={s.previewKey}>Por unidad de consumo</span>
                <span className={s.previewHow}>
                  {flow.annualIncome !== null
                    ? `${euro(flow.annualIncome)} al año ÷ ${num(flow.units, Number.isInteger(flow.units) ? 0 : 1)}`
                    : 'Ingresos al año ÷ unidades de consumo'}
                </span>
              </span>
              <span className={s.previewValue}>{flow.equivIncome !== null ? euro(flow.equivIncome) : '—'}</span>
            </div>
          </div>

          {/* 4 ∙ ¿Dónde crees que te bajas? */}
          <div className={cx(s.card, s.areaGuess)}>
            <label htmlFor={ids.guess} className={s.stepLabel}>
              <span className={s.num} aria-hidden="true">
                4
              </span>
              ¿Dónde crees que te bajas?
            </label>
            <div className={s.guessRow}>
              <button
                type="button"
                className={s.btnMinus}
                aria-label="Parada anterior"
                aria-controls={ids.guess}
                aria-disabled={guess <= LIMITS.perceived.min}
                onClick={() => setGuess(guess - 1)}
              >
                <MinusIcon />
              </button>
              <span className={s.guessWord} aria-hidden="true">
                Parada
              </span>
              <input
                id={ids.guess}
                className={s.guessInput}
                type="text"
                inputMode="numeric"
                role="spinbutton"
                autoComplete="off"
                aria-valuemin={LIMITS.perceived.min}
                aria-valuemax={LIMITS.perceived.max}
                aria-valuenow={guess}
                aria-describedby={`${ids.guessOf} ${ids.guessSentence}`}
                value={guessDraft}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setGuessDraft(d)
                  const n = Number(d)
                  if (d && n >= LIMITS.perceived.min && n <= LIMITS.perceived.max) flow.set('perceivedPercentile', n)
                }}
                onBlur={() => setGuessDraft(String(guess))}
                onKeyDown={(e) => {
                  const step = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key]
                  if (step) {
                    e.preventDefault()
                    setGuess(guess + step)
                  } else if (e.key === 'Home' || e.key === 'End') {
                    e.preventDefault()
                    setGuess(e.key === 'Home' ? LIMITS.perceived.min : LIMITS.perceived.max)
                  }
                }}
              />
              <button
                type="button"
                className={s.btnPlus}
                aria-label="Parada siguiente"
                aria-controls={ids.guess}
                aria-disabled={guess >= LIMITS.perceived.max}
                onClick={() => setGuess(guess + 1)}
              >
                <PlusIcon />
              </button>
              <span id={ids.guessOf} className={s.guessOf}>
                de 99
              </span>
            </div>

            <div className={s.mini}>
              <input
                type="range"
                className={s.range}
                min={LIMITS.perceived.min}
                max={LIMITS.perceived.max}
                step={1}
                value={guess}
                aria-label="Tu parada en la línea, de la 1 a la 99"
                onChange={(e) => setGuess(Number(e.target.value))}
                style={{ '--t': stopPosition(guess) } as React.CSSProperties}
              />
              <div className={s.miniEnds} aria-hidden="true">
                <span>1 ∙ menos renta</span>
                <span>99 ∙ más renta</span>
              </div>
            </div>
            <p id={ids.guessSentence} className={s.note}>
              Crees que {guess} de cada 100 personas viven en hogares con menos ingresos que el tuyo.
            </p>
          </div>
        </div>

        {flow.error && (
          <div className={s.alert} role="alert">
            <StopIcon className={s.msgIcon} />
            <span className={s.alertText}>{flow.error}</span>
            <button type="submit" className={s.alertButton}>
              Reintentar
            </button>
          </div>
        )}

        <div className={s.ctaWrap}>
          <button type="submit" className={s.cta} aria-disabled={!ready} aria-describedby={ids.hint}>
            <span>Sacar billete</span>
            {ready && <ArrowIcon className={s.ctaArrow} />}
          </button>
          <span
            key={nudge}
            id={ids.hint}
            className={cx(s.ctaHint, ready && s.ctaHintReady, nudge > 0 && !ready && s.ctaHintNudge)}
          >
            {hint}
          </span>
        </div>
      </form>
    </main>
  )
}

/* ------------------------------------------------------------------ stepper */

interface StepperProps {
  name: string
  hint: string
  value: number
  min: number
  max: number
  units: [string, string]
  minusLabel: string
  plusLabel: string
  onChange: (n: number) => void
}

function Stepper({ name, hint, value, min, max, units, minusLabel, plusLabel, onChange }: StepperProps) {
  const uid = useId()
  const atMin = value <= min
  const atMax = value >= max
  return (
    <div className={s.traveller} role="group" aria-labelledby={`${uid}-name`}>
      <span className={s.travellerText}>
        <span id={`${uid}-name`} className={s.travellerName}>
          {name}
        </span>
        <span className={s.travellerHint}>{hint}</span>
      </span>
      <span className={s.controls}>
        <button
          type="button"
          className={s.btnMinus}
          aria-label={minusLabel}
          aria-disabled={atMin}
          onClick={() => !atMin && onChange(value - 1)}
        >
          <MinusIcon />
        </button>
        <output className={s.count} aria-live="polite" aria-atomic="true">
          {value}
          <span className={s.srOnly}> {value === 1 ? units[0] : units[1]}</span>
        </output>
        <button
          type="button"
          className={s.btnPlus}
          aria-label={plusLabel}
          aria-disabled={atMax}
          onClick={() => !atMax && onChange(value + 1)}
        >
          <PlusIcon />
        </button>
      </span>
    </div>
  )
}
