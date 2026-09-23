'use client'

import s from './App.module.css'

// widths (in %) of the lines of type set on the proof, column by column
const COLUMNS = [
  [100, 96, 100, 91, 100, 58],
  [100, 94, 100, 97, 72, 100],
  [98, 100, 88, 100, 100, 44],
]

// The loading state: the paper goes to press. A proof sheet is set line by
// line while a red roller runs across it.
export default function Imprenta() {
  return (
    <main className={s.press} aria-busy="true">
      <p className={s.kicker}>En imprenta</p>
      <h1 className={s.pressTitle}>Componiendo tu edición…</h1>
      <p className={s.pressDek}>
        Situamos tus ingresos entre los de 37.072 secciones censales y más de 8.000 municipios.
      </p>
      <div className={s.proof} aria-hidden="true">
        <span className={s.roller} />
        <span className={s.proofHead} style={{ width: '88%' }} />
        <span className={s.proofHead} style={{ width: '54%', animationDelay: '90ms' }} />
        <div className={s.proofCols}>
          {COLUMNS.map((col, c) => (
            <div key={c} className={s.proofCol}>
              {col.map((w, i) => (
                <span
                  key={i}
                  className={s.proofLine}
                  style={{ width: `${w}%`, animationDelay: `${220 + c * 260 + i * 70}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
