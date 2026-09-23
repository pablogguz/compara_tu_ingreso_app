'use client'

import { useMemo, type CSSProperties } from 'react'
import type { Flow } from '../shared/useFlow'
import { naturalName } from '../shared/format'
import { amount, stampDate, unitsText, YEAR } from './copy'
import Stamp from './Stamp'
import { Page, SheetHeader, cx } from './ui'
import a from './App.module.css'
import s from './Processing.module.css'

// While the numbers are computed: the declaration goes through the registry.
// The boxes are checked one by one and the date stamp comes down on the space
// the cover reserved for it. The whole thing lasts about a second and a half.
export default function Processing({ flow }: { flow: Flow }) {
  const date = useMemo(() => stampDate(), [])
  const m = flow.municipality
  const rows = [
    {
      box: '01',
      label: 'Municipio de residencia',
      value: m ? `${naturalName(m.mun_name)} (${m.mun_code})` : '—',
    },
    {
      box: '02 · 03',
      label: 'Ingresos netos anuales del hogar',
      value: flow.annualIncome !== null ? amount(flow.annualIncome) : '—',
    },
    { box: '04 · 05', label: 'Unidades de consumo', value: unitsText(flow.units) },
    { box: '06', label: 'Percentil declarado', value: String(flow.answers.perceivedPercentile) },
  ]
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <Page
      strip={`Ejemplar para el interesado · Registro de entrada · Ejercicio ${YEAR}`}
      stripShort={`Registro de entrada · Ejercicio ${YEAR}`}
    >
      <div className={cx(a.sheet, a.fill)}>
        <SheetHeader
          variant="wide"
          title="Registro de entrada"
          sub="Tramitando su declaración…"
          aside={
            <>
              <span className={a.asideLabel}>Nº de registro</span>
              <span className={a.asideValue}>
                {m?.mun_code ?? '00000'}-{YEAR}-····
              </span>
            </>
          }
        />
        <div className={s.body}>
          <section className={s.checks} aria-label="Comprobación de casillas">
            <h2 className={s.h2}>Comprobación de casillas</h2>
            <ol className={s.list}>
              {rows.map((r, i) => (
                <li key={r.box} className={s.row} style={step(i)}>
                  <span className={s.box}>{r.box}</span>
                  <span className={s.label}>{r.label}</span>
                  <span className={s.leader} aria-hidden="true" />
                  <span className={s.value}>{r.value}</span>
                  <span className={s.ok}>Conforme</span>
                </li>
              ))}
              <li className={cx(s.row, s.rowLast)} style={step(rows.length)}>
                <span className={s.box}>10 · 13</span>
                <span className={s.label}>Cotejo con el Atlas de Distribución de Renta (INE)</span>
                <span className={s.leader} aria-hidden="true" />
                <span className={s.busy}>
                  En trámite
                  <span className={s.cursor} aria-hidden="true" />
                </span>
              </li>
            </ol>
            <p className={s.fine}>
              Tramitación automática. Sus respuestas no salen de este navegador.
            </p>
          </section>
          <div className={s.side} aria-hidden="true">
            <div className={s.space}>
              <span className={s.spaceLabel}>Sello del registro</span>
              <Stamp variant="recibido" date={date} className={s.stamp} />
            </div>
          </div>
        </div>
        <footer className={a.foot}>
          <span>Tramitación sin cita previa</span>
          <span>No cierre esta ventanilla</span>
        </footer>
      </div>
    </Page>
  )
}
