'use client'

import { useId, useState, type FormEvent, type KeyboardEvent, type Ref } from 'react'
import MunicipalitySearch, { municipalityLabel } from '../shared/MunicipalitySearch'
import { LIMITS, type Flow } from '../shared/useFlow'
import { euro, naturalName, num, scaleExplained } from '../shared/format'
import { CODE_URL, NOTE_URL, digitsOf, listJoin, plainMessage, plural } from './copy'
import Sparkline from './Sparkline'
import s from './Frase.module.css'

/** What the reader has typed, as typed (the flow only gets valid numbers). */
export interface Drafts {
  adults: string
  children: string
  income: string
  guess: string
}

export const INITIAL_DRAFTS: Drafts = { adults: '1', children: '0', income: '', guess: '' }

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ')

/** "12" → 12; "" → null */
function count(text: string): number | null {
  const d = text.replace(/\D/g, '')
  return d === '' ? null : parseInt(d, 10)
}

function Chevron({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3 6l5 5 5-5" />
    </svg>
  )
}

interface BlankProps {
  id: string
  label: string
  value: string
  placeholder: string
  invalid?: boolean
  describedBy?: string
  wide?: boolean
  onChange: (value: string) => void
  onBlur?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

// An inline blank in the sentence. The wrapper grows with its text: a hidden
// copy of the value sits in the same grid cell and sets the width.
function Blank({ id, label, value, placeholder, invalid, describedBy, wide, onChange, onBlur, onKeyDown }: BlankProps) {
  return (
    <span className={cx(s.grow, wide && s.growWide)} data-value={value || placeholder}>
      <input
        id={id}
        className={cx(s.blank, invalid && s.blankInvalid)}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        size={1}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </span>
  )
}

interface FraseProps {
  flow: Flow
  drafts: Drafts
  setDrafts: (update: (d: Drafts) => Drafts) => void
  onRead: () => void
  titleRef?: Ref<HTMLHeadingElement>
}

// The front page: the questionnaire is one sentence with blanks.
export default function Frase({ flow, drafts, setDrafts, onRead, titleRef }: FraseProps) {
  const uid = useId()
  const ids = {
    mun: `${uid}-mun`,
    adults: `${uid}-adults`,
    children: `${uid}-children`,
    income: `${uid}-income`,
    pagas: `${uid}-pagas`,
    guess: `${uid}-guess`,
    errors: `${uid}-errors`,
    note: `${uid}-note`,
    foot: `${uid}-foot`,
    how: `${uid}-how`,
  }
  const [munFocus, setMunFocus] = useState(false)
  const [munText, setMunText] = useState('')

  // ---- validation --------------------------------------------------------
  const adults = count(drafts.adults)
  const children = count(drafts.children)
  const guess = count(drafts.guess)
  const adultsOk = adults !== null && adults >= LIMITS.adults.min && adults <= LIMITS.adults.max
  const childrenOk = children !== null && children >= LIMITS.children.min && children <= LIMITS.children.max
  const guessOk = guess !== null && guess >= LIMITS.perceived.min && guess <= LIMITS.perceived.max
  const incomeGarbled = drafts.income.trim() !== '' && digitsOf(drafts.income) === ''
  const incomeInvalid = incomeGarbled || flow.income.state === 'invalid'
  const ready = flow.canCalculate && adultsOk && childrenOk && guessOk && !incomeGarbled

  const errors: Array<{ key: string; text: string }> = []
  if (incomeGarbled) errors.push({ key: 'income', text: 'Escribe los ingresos en cifras, por ejemplo 2.400.' })
  else if (flow.income.state === 'invalid') errors.push({ key: 'income', text: plainMessage(flow.income.message) })
  if (drafts.adults !== '' && !adultsOk) errors.push({ key: 'adults', text: 'En un hogar caben de 1 a 20 adultos.' })
  if (drafts.children !== '' && !childrenOk) errors.push({ key: 'children', text: 'Los menores van de 0 a 20.' })
  if (drafts.guess !== '' && !guessOk) errors.push({ key: 'guess', text: 'Tu estimación tiene que ir del 1 al 99 %.' })
  const warning = flow.income.state === 'warning' ? plainMessage(flow.income.message) : null

  const missing: string[] = []
  if (!flow.municipality) missing.push('tu municipio')
  if (drafts.adults === '') missing.push('cuántos adultos sois')
  if (drafts.children === '') missing.push('cuántos menores')
  if (flow.income.state === 'empty' && !incomeGarbled) missing.push('tus ingresos')
  if (drafts.guess === '') missing.push('tu estimación')

  const note = ready
    ? 'Menos de un minuto. Las cuentas se hacen en tu navegador.'
    : errors.length
      ? 'Corrige lo marcado en rojo para seguir.'
      : missing.length
        ? `${missing.length > 1 ? 'Faltan' : 'Falta'} ${listJoin(missing)}.`
        : 'Menos de un minuto. Las cuentas se hacen en tu navegador.'

  const monthly = typeof flow.answers.monthlyIncome === 'number' ? flow.answers.monthlyIncome : null
  const working =
    flow.equivIncome !== null && flow.annualIncome !== null && monthly !== null && adultsOk && childrenOk
      ? `Al año, ${euro(flow.annualIncome)} (${euro(monthly)} × ${flow.answers.paymentPeriods} pagas). ` +
        `Tu hogar cuenta como ${scaleExplained(adults, children)}: te comparamos con ${euro(flow.equivIncome)} por unidad de consumo.`
      : null

  // grammar follows the numbers
  const solo = adults === 1 && children === 0

  // ---- updates -----------------------------------------------------------
  const update = (key: keyof Drafts, value: string) => setDrafts((d) => ({ ...d, [key]: value }))

  const setCount = (key: 'adults' | 'children' | 'guess', text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 2)
    update(key, clean)
    const n = count(clean)
    if (n === null) return
    if (key === 'adults' && n >= LIMITS.adults.min && n <= LIMITS.adults.max) flow.set('adults', n)
    if (key === 'children' && n >= LIMITS.children.min && n <= LIMITS.children.max) flow.set('children', n)
    if (key === 'guess' && n >= LIMITS.perceived.min && n <= LIMITS.perceived.max) flow.set('perceivedPercentile', n)
  }

  const step =
    (key: 'adults' | 'children' | 'guess', min: number, max: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const current = count(drafts[key]) ?? (key === 'guess' ? 50 : min)
      const next = Math.min(max, Math.max(min, current + (e.key === 'ArrowUp' ? 1 : -1)))
      setCount(key, String(next))
    }

  const setIncome = (text: string) => {
    const clean = text.replace(/[^\d.,\s]/g, '').slice(0, 12)
    update('income', clean)
    const d = digitsOf(clean)
    flow.set('monthlyIncome', d === '' ? '' : Number(d))
  }

  const tidyIncome = () => {
    const d = digitsOf(drafts.income)
    if (d !== '') update('income', num(Number(d)))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready) onRead()
  }

  // the municipality blank grows with the longest of what it may show
  const selectedLabel = flow.municipality
    ? municipalityLabel({
        munName: naturalName(flow.municipality.mun_name),
        provName: naturalName(flow.municipality.prov_name),
      })
    : ''
  const munPlaceholder = flow.loadingMunicipalities ? 'Cargando municipios…' : 'tu municipio'
  const munSizer = [munFocus ? munText : '', selectedLabel, munPlaceholder].reduce((a, b) => (b.length > a.length ? b : a))

  const errorFor = (key: string) => (errors.some((e) => e.key === key) ? ids.errors : undefined)

  return (
    <>
      <div className={s.landing}>
        <main className={s.main}>
          <p className={s.kicker}>La pregunta</p>
          <h1 ref={titleRef} tabIndex={-1} className={s.title}>
            ¿Dónde está tu hogar en el reparto de la renta?
          </h1>
          <p className={s.dek}>
            Completa la frase. Te decimos cuántas personas de España, de tu provincia y de tu municipio viven en
            hogares que ingresan menos que el tuyo.
          </p>

          <form className={s.form} onSubmit={submit} noValidate>
            <div className={s.sentence}>
              Vivo en{' '}
              <span
                className={s.munField}
                onFocus={() => {
                  setMunFocus(true)
                  setMunText(selectedLabel)
                }}
                onBlur={() => setMunFocus(false)}
                onInput={(e) => setMunText((e.target as HTMLInputElement).value)}
              >
                <span className={s.munGrow} data-value={munSizer}>
                  <MunicipalitySearch
                    label="Municipio de residencia"
                    inputId={ids.mun}
                    value={flow.answers.municipality}
                    onChange={(code) => flow.set('municipality', code)}
                    placeholder="tu municipio"
                    maxResults={7}
                    classes={{
                      root: s.munRoot,
                      input: s.munInput,
                      list: s.munList,
                      option: s.munOption,
                      optionActive: s.munOptionActive,
                      name: s.munName,
                      meta: s.munMeta,
                      status: s.munStatus,
                    }}
                  />
                </span>
                <Chevron className={s.chevron} />
              </span>
              <span className={s.comma}>,</span> en un hogar de{' '}
              <Blank
                id={ids.adults}
                label="Adultos en el hogar: personas de 14 años o más, tú incluido"
                value={drafts.adults}
                placeholder="1"
                invalid={drafts.adults !== '' && !adultsOk}
                describedBy={errorFor('adults') ?? ids.foot}
                onChange={(v) => setCount('adults', v)}
                onKeyDown={step('adults', LIMITS.adults.min, LIMITS.adults.max)}
              />{' '}
              {plural(adults ?? 2, 'adulto', 'adultos')}
              <sup className={s.mark} aria-hidden="true">
                *
              </sup>{' '}
              y{' '}
              <Blank
                id={ids.children}
                label="Menores de 14 años en el hogar"
                value={drafts.children}
                placeholder="0"
                invalid={drafts.children !== '' && !childrenOk}
                describedBy={errorFor('children')}
                onChange={(v) => setCount('children', v)}
                onKeyDown={step('children', LIMITS.children.min, LIMITS.children.max)}
              />{' '}
              {plural(children ?? 2, 'menor', 'menores')} de 14 años. {solo ? 'Ingreso' : 'Entre todos ingresamos'}{' '}
              <Blank
                id={ids.income}
                label="Ingresos netos mensuales del hogar, en euros"
                value={drafts.income}
                placeholder="¿cuánto?"
                wide
                invalid={incomeInvalid}
                describedBy={errorFor('income')}
                onChange={setIncome}
                onBlur={tidyIncome}
              />{' '}
              € netos al mes, en{' '}
              <span className={s.selectField}>
                <select
                  id={ids.pagas}
                  className={s.select}
                  aria-label="Número de pagas al año"
                  value={flow.answers.paymentPeriods}
                  onChange={(e) => flow.set('paymentPeriods', e.target.value === '14' ? 14 : 12)}
                >
                  <option value={12}>12</option>
                  <option value={14}>14</option>
                </select>
                <Chevron className={s.chevronSmall} />
              </span>{' '}
              pagas. Creo que {solo ? 'ingreso' : 'ingresamos'} más que el{' '}
              <Blank
                id={ids.guess}
                label="Porcentaje de la población que crees que vive en hogares con menos ingresos que el tuyo"
                value={drafts.guess}
                placeholder="¿cuánto?"
                invalid={drafts.guess !== '' && !guessOk}
                describedBy={errorFor('guess')}
                onChange={(v) => setCount('guess', v)}
                onKeyDown={step('guess', LIMITS.perceived.min, LIMITS.perceived.max)}
              />{' '}
              % de la población.
            </div>

            <div className={s.notes}>
              <div id={ids.errors} aria-live="polite" className={s.alerts}>
                {errors.map((e) => (
                  <p key={e.key} className={s.error}>
                    <span className={s.tag}>Ojo</span>
                    {e.text}
                  </p>
                ))}
                {warning && (
                  <p className={s.warning}>
                    <span className={s.tag}>Ojo</span>
                    {warning}.
                  </p>
                )}
              </div>
              {working && (
                <p className={s.working}>
                  <span className={s.tagInk}>Las cuentas</span>
                  {working}
                </p>
              )}
              <p id={ids.foot} className={s.footnote}>
                <span className={s.mark} aria-hidden="true">
                  *
                </span>{' '}
                Cuenta como adulto toda persona de 14 años o más, tú incluido.
              </p>
            </div>

            <div className={s.actions}>
              <button type="submit" className={s.cta} disabled={!ready} aria-describedby={ids.note}>
                Leer mi resultado
                <svg className={s.ctaArrow} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                  <path d="M2 9h13M10 4l5 5-5 5" />
                </svg>
              </button>
              <p id={ids.note} className={s.ctaNote} aria-live="polite">
                {note}
              </p>
            </div>
          </form>
        </main>

        <aside className={s.aside} aria-labelledby={ids.how}>
          <h2 id={ids.how} className={s.asideHead}>
            Cómo lo calculamos
          </h2>
          <figure className={s.spark}>
            <Sparkline />
            <div className={s.sparkTicks} aria-hidden="true">
              <span>0 €</span>
              <span>45.000 €</span>
              <span>90.000 €</span>
            </div>
            <figcaption className={s.sparkCaption}>
              Cómo se reparte la población de España según la renta anual por unidad de consumo de su hogar, 2024.
              Fuente: INE.
            </figcaption>
          </figure>
          <ol className={s.steps}>
            <li>
              Partimos de la renta de las 37.072 secciones censales de España, que el INE calcula a partir de las
              declaraciones del IRPF.
            </li>
            <li>Ajustamos por el tamaño del hogar con la escala de la OCDE, para poder comparar hogares distintos.</li>
            <li>Situamos tus ingresos entre los de todo el país, tu provincia y tu municipio.</li>
          </ol>
          <a className={s.noteLink} href={NOTE_URL} target="_blank" rel="noopener noreferrer">
            Nota metodológica completa <span aria-hidden="true">→</span>
          </a>
        </aside>
      </div>

      <footer className={s.footer}>
        <span>Por Pablo García Guzmán</span>
        <span>
          <a href={CODE_URL} target="_blank" rel="noopener noreferrer">
            Código abierto
          </a>{' '}
          · Datos: INE, Atlas de Distribución de Renta de los Hogares
        </span>
      </footer>
    </>
  )
}
