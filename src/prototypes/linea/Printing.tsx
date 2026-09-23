'use client'

import { useEffect, useRef } from 'react'
import type { Flow } from '../shared/useFlow'
import { euro, naturalName } from '../shared/format'
import Brand from './Brand'
import { travellers } from './network'
import s from './Printing.module.css'

// "Imprimiendo billete…": the ticket feeds out of the machine's slot while the
// calculation runs (useFlow holds a minimum beat so the print can finish).
export default function Printing({ flow }: { flow: Flow }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const { answers, municipality } = flow
  const mun = municipality ? naturalName(municipality.mun_name) : '—'
  const prov = municipality ? naturalName(municipality.prov_name) : 'tu provincia'
  const monthly = typeof answers.monthlyIncome === 'number' ? answers.monthlyIncome : 0

  return (
    <main className={s.screen} aria-labelledby="linea-printing-title" aria-busy="true">
      <div className={s.stack}>
        <div className={s.machine} aria-hidden="true">
          <div className={s.machineTop}>
            <Brand size="sm" />
            <span className={s.led}>
              <span className={s.ledDot} />
              Imprimiendo
            </span>
          </div>
          <div className={s.slot} />
        </div>

        <div className={s.clip} aria-hidden="true">
          <div className={s.ticket}>
            <div className={s.bands}>
              <span className={s.band1} />
              <span className={s.band2} />
              <span className={s.band3} />
            </div>
            <div className={s.ticketHead}>
              <span>Billete sencillo</span>
              <span>Ejercicio 2024</span>
            </div>
            <dl className={s.rows}>
              <div className={s.row}>
                <dt>Origen</dt>
                <dd>{mun}</dd>
              </div>
              <div className={s.row}>
                <dt>Viajeros</dt>
                <dd>{travellers(answers.adults, answers.children)}</dd>
              </div>
              <div className={s.row}>
                <dt>Ingresos</dt>
                <dd>
                  {euro(monthly)} × {answers.paymentPeriods}
                </dd>
              </div>
            </dl>
            <div className={s.stub}>
              {(['L1', 'L2', 'L3'] as const).map((code, i) => (
                <span key={code} className={s.stubItem}>
                  <span className={[s.code1, s.code2, s.code3][i]}>{code}</span>
                  <span className={s.dots} style={{ animationDelay: `${i * 160}ms` }}>
                    ··
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <h1 id="linea-printing-title" ref={headingRef} tabIndex={-1} className={s.title}>
          Imprimiendo billete…
        </h1>
        <p className={s.sub}>
          Buscamos tu parada en tres líneas: España, la provincia de {prov} y {mun}.
        </p>
      </div>
    </main>
  )
}
