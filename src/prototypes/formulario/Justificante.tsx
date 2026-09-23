'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { Flow } from '../shared/useFlow'
import type { LevelKey, LevelsData } from '../shared/useLevels'
import { euro, pct, shareText } from '../shared/format'
import { shareResult, type ShareOutcome } from '../shared/share'
import { amount, gapUsted, headlineUsted, receiptNumber, unitsText, YEAR } from './copy'
import Histogram from './Histogram'
import Stamp from './Stamp'
import { Barcode, Chip, Page, ScissorsIcon, SheetHeader, cx } from './ui'
import a from './App.module.css'
import f from './Form.module.css'
import s from './Justificante.module.css'

interface JustificanteProps {
  flow: Flow
  data: LevelsData
  onAgain: () => void
  onInstructions: () => void
  onAnnounce: (text: string) => void
}

interface Row {
  box: string
  label: string
  /** the label on phones (mockup B4) */
  short?: string
  value: string
  shortValue?: string
  strong?: boolean
  red?: boolean
  /** B4 leaves 07 and 08 out */
  wideOnly?: boolean
}

// The result: a stamped receipt with the liquidation, two annexes and a
// tear-off stub.
export default function Justificante({ flow, data, onAgain, onInstructions, onAnnounce }: JustificanteProps) {
  const uid = useId()
  const [national, provincial, municipal] = data.levels
  const m = flow.municipality
  const munCode = m?.mun_code ?? flow.answers.municipality
  const munName = municipal.place
  const provName = provincial.place
  const p = national.percentile
  const guess = flow.answers.perceivedPercentile
  const gap = gapUsted(national.rawPercentile, guess)
  const number = receiptNumber(munCode, p)
  const income = flow.results?.equiv_income ?? flow.equivIncome ?? 0
  const annual = flow.annualIncome ?? 0
  const title = headlineUsted(national.rawPercentile, 'España')

  // ---- focus the receipt and read the result out, once -----------------------
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    onAnnounce(`${title} ${gap.long}`)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Anexo I: which distribution ------------------------------------------
  const [levelKey, setLevelKey] = useState<LevelKey>('national')
  const level = data.levels.find((l) => l.key === levelKey) ?? national
  const places: Record<LevelKey, { option: string; short: string; phrase: string }> = {
    national: { option: 'España', short: 'España', phrase: 'España' },
    provincial: { option: `Provincia de ${provName}`, short: 'Provincia', phrase: `la provincia de ${provName}` },
    municipal: { option: `Municipio de ${munName}`, short: 'Municipio', phrase: `el municipio de ${munName}` },
  }

  // ---- share ------------------------------------------------------------------
  const [shared, setShared] = useState<ShareOutcome | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const share = async () => {
    const outcome = await shareResult(shareText(p))
    setShared(outcome)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShared(null), 2800)
  }
  const shareNote =
    shared === 'copied' ? 'Copiado' : shared === 'shared' ? 'Compartido' : shared === 'failed' ? 'No se pudo copiar' : ''

  // ---- the liquidation --------------------------------------------------------
  const rows: Row[] = [
    { box: '07', label: 'Ingresos netos anuales del hogar', value: amount(annual), wideOnly: true },
    { box: '08', label: 'Unidades de consumo', value: unitsText(flow.units), wideOnly: true },
    {
      box: '09',
      label: 'Renta por unidad de consumo (07 ÷ 08)',
      short: 'Renta por unidad de consumo',
      value: amount(income),
      shortValue: euro(income),
    },
    { box: '10', label: 'Percentil en España', value: String(p), strong: true },
    {
      box: '11',
      label: `Percentil en la provincia de ${provName}`,
      short: `Provincia de ${provName}`,
      value: String(provincial.percentile),
    },
    {
      box: '12',
      label: `Percentil en el municipio de ${munName}`,
      short: `Municipio de ${munName}`,
      value: String(municipal.percentile),
    },
    { box: '06', label: 'Percentil declarado por usted', short: 'Su estimación', value: String(guess) },
    { box: '13', label: 'Diferencia (10 − 06)', short: 'Diferencia', value: gap.signed, strong: true, red: true },
  ]

  // ---- Anexo II ---------------------------------------------------------------
  const stats = data.stats
  const facts: Array<{ key: string; value: string; label: string }> = []
  if (stats) {
    const label = (text: string, year: number, imputed: number | undefined) =>
      `${text} (${year}${imputed ? ', media provincial' : ''})`
    if (Number.isFinite(stats.net_income_equiv)) {
      facts.push({
        key: 'renta',
        value: euro(stats.net_income_equiv),
        label: label('Renta media por unidad de consumo', 2024, stats.net_income_equiv_is_imputed),
      })
    }
    if (Number.isFinite(stats.pct_higher_ed_completed)) {
      facts.push({
        key: 'estudios',
        value: pct(stats.pct_higher_ed_completed),
        label: label(
          'Población de 15 y más años con estudios superiores',
          2023,
          stats.pct_higher_ed_completed_is_imputed
        ),
      })
    }
    if (Number.isFinite(stats.pct_foreign_born)) {
      facts.push({
        key: 'extranjero',
        value: pct(stats.pct_foreign_born),
        label: label('Población nacida en el extranjero', 2024, stats.pct_foreign_born_is_imputed),
      })
    }
  }

  const tens = p >= 10 ? String(Math.floor(p / 10)) : ''
  const units = String(p % 10)
  const stubNums: Array<[string, string, number]> = [
    ['España', 'España', p],
    [`Provincia de ${provName}`, 'Provincia', provincial.percentile],
    [munName, 'Municipio', municipal.percentile],
  ]

  return (
    <Page
      strip={`Ejemplar para el interesado · Justificante · Ejercicio ${YEAR}`}
      stripShort={`Justificante · Ejercicio ${YEAR}`}
      hideStripOnPhone
    >
      <article className={a.sheet} aria-labelledby={`${uid}-title`}>
        <SheetHeader
          variant="wide"
          largeTitle
          titleId={`${uid}-title`}
          titleRef={titleRef}
          title="Justificante de posición de renta del hogar"
          sub={`Ejercicio ${YEAR} · Municipio de ${munName} (${munCode})`}
          phoneSub={number}
          aside={
            <>
              <span className={a.asideLabel}>Nº de justificante</span>
              <span className={a.asideValue}>{number}</span>
            </>
          }
        />

        {/* ---- 10 · the result and the stamp ---- */}
        <section className={s.hero} aria-label="Resultado">
          <div className={s.box10}>
            <p className={s.boxLabel}>
              <Chip>10</Chip> <span>Percentil en España</span>
            </p>
            <p className={s.digits}>
              <span className={s.digit} aria-hidden="true">
                {tens}
              </span>
              <span className={s.digit} aria-hidden="true">
                {units}
              </span>
              <span className={a.srOnly}>Percentil {p}</span>
            </p>
          </div>
          <div className={s.heroText}>
            <p className={s.headline}>{title}</p>
            <p className={s.gap}>
              <span className={s.gapLong}>{gap.long}</span>
              <span className={s.gapShort}>{gap.short}</span>
            </p>
          </div>
          <Stamp variant="calculado" percentile={p} className={s.stamp} />
        </section>

        <div className={s.middle}>
          {/* ---- Liquidación ---- */}
          <section className={s.liq} aria-labelledby={`${uid}-liq`}>
            <h2 id={`${uid}-liq`} className={s.h2}>
              Liquidación
            </h2>
            <dl className={s.rows}>
              {rows.map((r, i) => (
                <div
                  key={r.box}
                  className={cx(s.row, r.strong && s.rowStrong, r.wideOnly && s.wideOnly)}
                  style={{ '--i': i, '--n': r.value.length } as CSSProperties}
                >
                  <dt className={s.term}>
                    <span className={s.rowBox}>{r.box}</span>
                    <span className={s.rowLabel}>
                      <span className={s.long}>{r.label}</span>
                      <span className={s.short}>{r.short ?? r.label}</span>
                    </span>
                    <span className={s.leader} aria-hidden="true" />
                  </dt>
                  <dd className={cx(s.value, r.red && s.valueRed)}>
                    <span className={s.long}>{r.value}</span>
                    <span className={s.short}>{r.shortValue ?? r.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <button type="button" className={cx(a.linkButton, s.how, a.noPrint)} onClick={onInstructions}>
              Cómo se calcula · Instrucciones
            </button>
          </section>

          {/* ---- Anexo I ---- */}
          <section className={s.anexo1} aria-labelledby={`${uid}-a1`}>
            <h2 id={`${uid}-a1`} className={s.h2}>
              Anexo I · Renta por unidad de consumo en {places[levelKey].phrase}
            </h2>
            <fieldset className={cx(s.levels, a.noPrint)}>
              <legend className={a.srOnly}>Distribución que se muestra</legend>
              {data.levels.map((l) => (
                <label key={l.key} className={s.levelOption}>
                  <span className={f.xWrap}>
                    <input
                      type="radio"
                      name={`${uid}-ambito`}
                      value={l.key}
                      checked={levelKey === l.key}
                      onChange={() => setLevelKey(l.key)}
                      className={f.xInput}
                    />
                    <span className={f.xBox} aria-hidden="true" />
                  </span>
                  <span className={s.levelText}>
                    <span className={s.long}>{places[l.key].option}</span>
                    <span className={s.short}>{places[l.key].short}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Histogram
              level={level}
              income={income}
              place={places[levelKey].phrase}
              guess={
                level.key === 'national' && data.guessValue !== null
                  ? { percentile: guess, value: data.guessValue }
                  : null
              }
            />
          </section>
        </div>

        {/* ---- Anexo II ---- */}
        {facts.length > 0 && (
          <section className={s.anexo2} aria-labelledby={`${uid}-a2`}>
            <h2 id={`${uid}-a2`} className={cx(s.h2, s.anexo2Title)}>
              Anexo II · Municipio de {munName}
            </h2>
            {facts.map((x) => (
              <div key={x.key} className={s.fact}>
                <span className={s.factValue}>{x.value}</span>
                <span className={s.factLabel}>{x.label}</span>
              </div>
            ))}
          </section>
        )}
      </article>

      {/* ---- cut here ---- */}
      <div className={s.cut} aria-hidden="true">
        <ScissorsIcon />
        <span className={s.cutLine} />
        <span className={s.cutText}>Recorte y conserve</span>
      </div>

      {/* ---- Resguardo ---- */}
      <section className={s.stub} aria-labelledby={`${uid}-stub`}>
        <div className={s.stubId}>
          <h2 id={`${uid}-stub`} className={s.stubTitle}>
            Resguardo
          </h2>
          <span className={s.stubNumber}>{number}</span>
        </div>
        <dl className={s.stubNums}>
          {stubNums.map(([label, short, value]) => (
            <div key={short} className={s.stubNum}>
              <dt className={s.stubLabel} title={label}>
                <span className={s.long}>{label}</span>
                <span className={s.short}>{short}</span>
              </dt>
              <dd className={s.stubValue}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className={s.stubCode}>
          <Barcode code={number} height={48} unit={2} />
        </div>
        <div className={cx(s.stubActions, a.noPrint)}>
          <button type="button" className={cx(a.btn, s.action, s.actionAgain)} onClick={onAgain}>
            Volver a declarar
          </button>
          <button type="button" className={cx(a.btn, s.action, s.actionPrint)} onClick={() => window.print()}>
            <span>
              Descargar<span className={s.short}> justificante</span>
            </span>
          </button>
          <button type="button" className={cx(a.btn, s.action, s.actionShare)} onClick={share}>
            {shareNote || 'Compartir'}
          </button>
          <span className={a.srOnly} role="status">
            {shareNote}
          </span>
        </div>
      </section>
      <p className={s.fine}>
        Documento sin validez fiscal. Datos: INE, Atlas de Distribución de Renta de los Hogares (2023, proyectado a{' '}
        {YEAR}).
      </p>
    </Page>
  )
}
