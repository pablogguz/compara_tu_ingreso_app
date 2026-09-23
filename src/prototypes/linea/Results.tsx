'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Flow } from '../shared/useFlow'
import { useLevels, type Level, type Stats } from '../shared/useLevels'
import { euro, headline, naturalName, pct, perceptionGap, shareText } from '../shared/format'
import { shareResult, type ShareOutcome } from '../shared/share'
import Brand from './Brand'
import { HLine, VLine } from './Lines'
import { useCountUp, useMediaQuery, useReducedMotion } from './hooks'
import { cx, LINES, lowerFirst, perHundred, travellers, unitsShort } from './network'
import { CheckIcon, GuessIcon, StopIcon } from './Icons'
import s from './Results.module.css'

interface ResultsProps {
  flow: Flow
  onNewTrip: () => void
  onMethod: () => void
}

const KIND: Record<Level['key'], string> = {
  national: 'España',
  provincial: 'Provincia',
  municipal: 'Municipio',
}

function lineTitle(level: Level): string {
  return level.key === 'municipal' ? `${level.label} (municipio)` : level.label
}

export default function Results({ flow, onNewTrip, onMethod }: ResultsProps) {
  const { answers, results } = flow
  const data = useLevels(results, answers.municipality, answers.perceivedPercentile)
  const phone = useMediaQuery('(max-width: 719px)')
  const reduced = useReducedMotion()
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const [announce, setAnnounce] = useState('')
  const [share, setShare] = useState<ShareOutcome | null>(null)
  const ready = !data.loading && !data.error && data.levels.length === 3

  useEffect(() => {
    if (!ready) return
    h1Ref.current?.focus()
    const [nat, prov, mun] = data.levels
    const t = setTimeout(
      () =>
        setAnnounce(
          [nat, prov, mun].map(perHundred).join(' ')
        ),
      500
    )
    return () => clearTimeout(t)
    // announce once per trip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    if (!share) return
    const t = setTimeout(() => setShare(null), 2800)
    return () => clearTimeout(t)
  }, [share])

  if (!results) return null

  if (data.error) {
    return (
      <div className={s.fault}>
        <div className={s.faultCard} role="alert">
          <StopIcon size={32} className={s.faultIcon} />
          <h1 className={s.faultTitle}>Línea fuera de servicio</h1>
          <p>No hemos podido cargar las líneas de tu viaje. Vuelve a intentarlo en un momento.</p>
          <button type="button" className={s.btnNavy} onClick={onNewTrip}>
            Nuevo viaje
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={s.results} aria-busy="true">
        <header className={s.head}>
          <div className={s.headInner}>
            <Brand size="md" />
          </div>
        </header>
      </div>
    )
  }

  const levels = data.levels
  const nat = levels[0]
  const p = nat.percentile
  const guessP = answers.perceivedPercentile
  const guess = data.guessValue !== null ? { p: guessP, value: data.guessValue } : null
  const gap = perceptionGap(nat.rawPercentile, guessP)
  const munName = flow.municipality ? naturalName(flow.municipality.mun_name) : nat.label
  const monthly = typeof answers.monthlyIncome === 'number' ? answers.monthlyIncome : 0
  const userValue = results.equiv_income
  const lede = `${lowerFirst(headline(p, 'España'))}.`

  const onShare = async () => setShare(await shareResult(shareText(nat.percentile)))

  const ticket = (
    <Ticket
      compact={phone}
      origin={flow.municipality ? `${munName} (${flow.municipality.mun_code})` : munName}
      travellersText={`${travellers(answers.adults, answers.children)} ∙ ${unitsShort(flow.units)}`}
      incomeText={`${euro(monthly)} × ${answers.paymentPeriods} pagas`}
      equivText={euro(userValue)}
      levels={levels}
    />
  )
  const station = data.stats ? <StationInfo compact={phone} stats={data.stats} name={munName} /> : null
  const actions = (
    <Actions compact={phone} share={share} onShare={onShare} onNewTrip={onNewTrip} onMethod={onMethod} />
  )
  const source = (
    <p className={s.source}>
      Fuente: INE, Atlas de Distribución de Renta de los Hogares (datos de 2023 actualizados a 2024) y Censo de
      Población. Las paradas son percentiles de la renta neta anual por unidad de consumo, ponderados por población.
    </p>
  )
  const live = (
    <p className={s.srOnly} role="status">
      {announce}
    </p>
  )

  /* ------------------------------------------------------------------ phone */
  if (phone) {
    return (
      <div className={s.results}>
        <header className={s.mHead}>
          <Brand size="sm" />
          <div className={s.mHeadRow}>
            <h1 ref={h1Ref} tabIndex={-1} className={s.mH1}>
              Usted está aquí
            </h1>
            <Roundel p={p} reduced={reduced} size="sm" />
          </div>
          <p className={s.mLede}>{headline(p, 'España')}.</p>
          <p className={s.mGap}>
            <GuessIcon size={20} className={s.mGapIcon} fill="none" />
            <span>{gap.sentence}</span>
          </p>
        </header>
        <main className={s.mBody}>
          <MobileLines levels={levels} userValue={userValue} guess={guess} reduced={reduced} />
          {ticket}
          {station}
          {actions}
          {source}
        </main>
        {live}
      </div>
    )
  }

  /* ---------------------------------------------------------------- desktop */
  return (
    <div className={s.results}>
      <header className={s.head}>
        <div className={s.headInner}>
          <div className={s.headText}>
            <div className={s.headTop}>
              <Brand size="md" />
              <span className={s.ticketLine}>
                ∙ Billete: {munName}, {travellers(answers.adults, answers.children)}, {euro(monthly)} al mes
                {answers.paymentPeriods === 14 ? ' (14 pagas)' : ''}
              </span>
            </div>
            <h1 ref={h1Ref} tabIndex={-1} className={s.h1}>
              Usted está aquí
            </h1>
            <p className={s.lede}>
              Te bajas en la <strong className={s.ledeStrong}>parada {p} de 99</strong> de la línea España: {lede}
            </p>
          </div>
          <Roundel p={p} reduced={reduced} size="lg" />
        </div>
      </header>

      <main className={s.main}>
        {levels.map((lv, i) => {
          const meta = LINES[lv.key]
          const isNational = lv.key === 'national'
          return (
            <section
              key={lv.key}
              className={s.lineCard}
              aria-labelledby={`linea-line-${lv.key}`}
              style={{ '--line': meta.color } as React.CSSProperties}
            >
              <div className={s.lineHead}>
                <span className={s.code}>{meta.code}</span>
                <h2 id={`linea-line-${lv.key}`} className={s.lineName}>
                  {lv.key === 'municipal' ? (
                    <>
                      {lv.label} <span className={s.lineKind}>(municipio)</span>
                    </>
                  ) : (
                    lv.label
                  )}
                </h2>
                <span className={s.lineStop}>
                  Tu parada: <strong className={s.lineStopNum}>{lv.percentile}</strong>{' '}
                  <span className={s.lineStopOf}>de 99</span>
                </span>
              </div>
              <HLine
                level={lv}
                meta={meta}
                userValue={userValue}
                guess={isNational ? guess : null}
                reduced={reduced}
                order={i}
              />
              <div className={s.lineFoot}>
                <p className={s.lineSentence}>{perHundred(lv)}</p>
                {isNational && (
                  <p className={s.gap}>
                    <GuessIcon size={20} className={s.gapIcon} />
                    <span>{gap.sentence}</span>
                  </p>
                )}
              </div>
            </section>
          )
        })}

        <div className={cx(s.bottom, !station && s.bottomSolo)}>
          {ticket}
          {station}
        </div>
        {actions}
        {source}
      </main>
      {live}
    </div>
  )
}

/* ------------------------------------------------------------------ roundel */

function Roundel({ p, reduced, size }: { p: number; reduced: boolean; size: 'sm' | 'lg' }) {
  const shown = useCountUp(p, 1150, 120, reduced)
  return (
    <div className={cx(s.roundel, size === 'sm' ? s.roundelSm : s.roundelLg)} aria-hidden="true">
      <span className={s.roundelLabel}>Parada</span>
      <span className={s.roundelNum}>{shown}</span>
    </div>
  )
}

/* ------------------------------------------------------------- phone lines */

function MobileLines({
  levels,
  userValue,
  guess,
  reduced,
}: {
  levels: Level[]
  userValue: number
  guess: { p: number; value: number } | null
  reduced: boolean
}) {
  const uid = useId()
  const [active, setActive] = useState(0)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const level = levels[active]
  const meta = LINES[level.key]
  const panelId = `${uid}-panel`

  const go = (i: number) => {
    const n = (i + levels.length) % levels.length
    setActive(n)
    tabs.current[n]?.focus()
  }

  return (
    <>
      <div
        className={s.tabs}
        role="tablist"
        aria-label="Líneas"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(active + 1)
          else if (e.key === 'ArrowLeft') go(active - 1)
          else if (e.key === 'Home') go(0)
          else if (e.key === 'End') go(levels.length - 1)
          else return
          e.preventDefault()
        }}
      >
        {levels.map((lv, i) => {
          const m = LINES[lv.key]
          const on = i === active
          return (
            <button
              type="button"
              key={lv.key}
              ref={(el) => {
                tabs.current[i] = el
              }}
              id={`${uid}-tab-${i}`}
              role="tab"
              aria-selected={on}
              aria-controls={panelId}
              aria-label={`${m.code} ${lv.label}: parada ${lv.percentile}`}
              tabIndex={on ? 0 : -1}
              className={cx(s.tab, on && s.tabOn)}
              style={{ '--line': m.color } as React.CSSProperties}
              onClick={() => setActive(i)}
            >
              <span className={s.tabTop}>
                {m.code} ∙ {lv.percentile}
              </span>
              <span className={s.tabKind}>{KIND[lv.key]}</span>
            </button>
          )
        })}
      </div>

      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${active}`}
        className={s.vCard}
        style={{ '--line': meta.color } as React.CSSProperties}
      >
        <div className={s.vHead}>
          <span className={s.code}>{meta.code}</span>
          <h2 className={s.vTitle}>{lineTitle(level)}</h2>
        </div>
        <VLine
          level={level}
          meta={meta}
          userValue={userValue}
          guess={level.key === 'national' ? guess : null}
          reduced={reduced}
          height={600}
        />
        <p className={s.vCaption}>{perHundred(level)}</p>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------- ticket */

interface TicketProps {
  compact: boolean
  origin: string
  travellersText: string
  incomeText: string
  equivText: string
  levels: Level[]
}

function Ticket({ compact, origin, travellersText, incomeText, equivText, levels }: TicketProps) {
  const rows: Array<[string, string]> = [
    ['Origen', origin],
    ['Viajeros', travellersText],
    ['Ingresos', incomeText],
    ['Renta por unidad de consumo', equivText],
  ]
  return (
    <section className={cx(s.ticket, compact && s.ticketCompact)} aria-labelledby="linea-ticket-title">
      <div className={s.ticketMain}>
        <h2 id="linea-ticket-title" className={s.boxTitle}>
          Tu billete ∙ ejercicio 2024
        </h2>
        <dl className={s.ticketGrid}>
          {rows.map(([k, v]) => (
            <div key={k} className={s.ticketField}>
              <dt className={s.ticketKey}>{k}</dt>
              <dd className={s.ticketValue}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <dl className={s.stub} aria-label="Tus paradas">
        {levels.map((lv) => (
          <div key={lv.key} className={s.stubRow}>
            <dt className={s.stubCode} style={{ color: LINES[lv.key].color }}>
              {LINES[lv.key].code}
              <span className={s.srOnly}> {lv.label}</span>
            </dt>
            <dd className={s.stubNum}>{lv.percentile}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ------------------------------------------------------------------ station */

function StationInfo({ stats, name, compact }: { stats: Stats; name: string; compact: boolean }) {
  const prov = (flag: number | undefined) => (Number(flag) === 1 ? ', media provincial' : '')
  const rows: Array<[string, string]> = [
    [`Renta media por unidad de consumo (2024${prov(stats.net_income_equiv_is_imputed)})`, euro(stats.net_income_equiv)],
    [`Con estudios superiores (2023${prov(stats.pct_higher_ed_completed_is_imputed)})`, pct(stats.pct_higher_ed_completed)],
    [`Nacidos en el extranjero (2024${prov(stats.pct_foreign_born_is_imputed)})`, pct(stats.pct_foreign_born)],
  ]
  return (
    <section className={cx(s.station, compact && s.stationCompact)} aria-labelledby="linea-station-title">
      <h2 id="linea-station-title" className={s.boxTitle}>
        {compact ? `Estación ${name}` : `Información de la estación ∙ ${name}`}
      </h2>
      <dl className={s.stationList}>
        {rows.map(([k, v]) => (
          <div key={k} className={s.stationRow}>
            <dt className={s.stationKey}>{k}</dt>
            <dd className={s.stationValue}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ------------------------------------------------------------------ actions */

function Actions({
  compact,
  share,
  onShare,
  onNewTrip,
  onMethod,
}: {
  compact: boolean
  share: ShareOutcome | null
  onShare: () => void
  onNewTrip: () => void
  onMethod: () => void
}) {
  const shareLabel =
    share === 'copied' ? 'Copiado' : share === 'shared' ? 'Compartido' : share === 'failed' ? 'No se pudo copiar' : 'Compartir billete'
  const shareButton = (
    <button type="button" className={cx(compact ? s.btnYellow : s.btnNavy, share && s.btnDone)} onClick={onShare}>
      {(share === 'copied' || share === 'shared') && <CheckIcon size={20} className={s.btnIcon} />}
      {shareLabel}
    </button>
  )
  const newTrip = (
    <button type="button" className={s.btnOutline} onClick={onNewTrip}>
      Nuevo viaje
    </button>
  )
  return (
    <div className={cx(s.actions, compact && s.actionsCompact)}>
      {compact ? (
        <>
          {shareButton}
          {newTrip}
        </>
      ) : (
        <>
          {newTrip}
          {shareButton}
        </>
      )}
      <button type="button" className={s.btnText} onClick={onMethod}>
        <span className={s.infoSign} aria-hidden="true">
          i
        </span>
        Cómo se calcula
      </button>
      <span className={s.srOnly} role="status">
        {share === 'copied' ? 'Texto copiado al portapapeles.' : share === 'failed' ? 'No se pudo copiar el texto.' : ''}
      </span>
    </div>
  )
}
