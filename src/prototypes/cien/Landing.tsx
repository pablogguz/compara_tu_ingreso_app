'use client'

import { HUNDRED, Arrow, CODE_URL, cx, stagger } from './ui'
import a from './App.module.css'
import s from './Landing.module.css'

// The unknown square: the one the questions will find.
const MYSTERY = 57

/** light → dark with income, as in the mockup (rgb warm greys 214 → 61) */
function shade(n: number): string {
  const l = Math.round(214 - (n - 1) * 1.55)
  return `rgb(${l}, ${l - 3}, ${l - 9})`
}

export default function Landing({ onStart, onMethod }: { onStart: () => void; onMethod: () => void }) {
  return (
    <div className={a.screen}>
      <nav className={a.topbar} aria-label="Principal">
        <span className={a.brand}>Compara tu ingreso</span>
        <div className={a.topLinks}>
          <button type="button" className={a.topLink} onClick={onMethod}>
            Metodología
          </button>
          <a className={a.topLink} href={CODE_URL} target="_blank" rel="noopener noreferrer">
            <span className={a.onlyWide}>Código abierto</span>
            <span className={a.onlyNarrow}>Código</span>
          </a>
        </div>
      </nav>

      <main className={s.body}>
        <div className={s.copy}>
          <h1 className={s.title}>
            <span className={s.titleLine}>Si España fuera 100 personas,</span>{' '}
            <span className={cx(s.titleLine, s.titleLine2)}>¿cuál serías tú?</span>
          </h1>
          <p className={s.lede}>
            Ordenamos a toda la población de España según los ingresos de su hogar, de menos a más, con los datos de
            las declaraciones de IRPF que publica el INE. Te decimos cuántas personas quedan por debajo de ti.
          </p>
          <div className={s.cta}>
            <button type="button" className={cx(a.btn, s.start)} onClick={onStart}>
              Empezar
              <Arrow className={a.btnIcon} />
            </button>
            <span className={s.meta}>4 preguntas · 1 minuto · sin registro</span>
          </div>
        </div>

        <figure className={s.figure}>
          <div
            className={s.grid}
            role="img"
            aria-label="Cien cuadrados, uno por cada 1 % de la población, ordenados de menos a más ingresos. Uno de ellos, todavía sin número, es el tuyo."
          >
            {HUNDRED.map((n) =>
              n === MYSTERY ? (
                <span key={n} className={cx(s.sq, s.mystery)} style={stagger(n - 1)}>
                  ?
                </span>
              ) : (
                <span key={n} className={s.sq} style={{ ...stagger(n - 1), background: shade(n) }} />
              )
            )}
          </div>
          <figcaption className={s.caption}>
            <span className={s.axis}>
              <span>1 · menos ingresos</span>
              <span>más ingresos · 100</span>
            </span>
            <span className={s.note}>Cada cuadrado es un 1 % de la población de España. Uno de ellos es el tuyo.</span>
          </figcaption>
        </figure>
      </main>
    </div>
  )
}
