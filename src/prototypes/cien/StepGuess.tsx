'use client'

import { useEffect, useRef, useState } from 'react'
import { LIMITS } from '@/prototypes/shared/useFlow'
import { HUNDRED, cx, pad2 } from './ui'
import q from './Question.module.css'

const TITLE_ID = 'cien-numero-title'
const HINT_ID = 'cien-numero-hint'
const { min: MIN, max: MAX } = LIMITS.perceived

interface StepGuessProps {
  value: number
  /** a square has been picked (the flow's default of 50 is never shown as an answer) */
  touched: boolean
  attempted: boolean
  onPick: (n: number) => void
}

// Pick your square among the hundred. The guess runs from 1 to 99, like the
// result (there is always someone above the 99), so the 100th square is shown
// but cannot be chosen. Radio-group semantics with a roving tabindex: arrows
// move by one (←→) or by a row (↑↓), Home/End jump to the ends, Enter goes on.
export default function StepGuess({ value, touched, attempted, onPick }: StepGuessProps) {
  const [focusN, setFocusN] = useState(touched ? value : 50)
  const [draft, setDraft] = useState(touched ? String(value) : '')
  const squares = useRef<Array<HTMLButtonElement | null>>([])
  const chosen = touched ? value : null

  useEffect(() => {
    if (touched) setDraft(String(value))
  }, [touched, value])

  const pick = (n: number, focus = false) => {
    const c = Math.max(MIN, Math.min(MAX, n))
    setFocusN(c)
    onPick(c)
    if (focus) squares.current[c]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const n = focusN
    const moves: Record<string, number | undefined> = {
      ArrowRight: n + 1,
      ArrowLeft: n - 1,
      ArrowDown: n + 10 <= MAX ? n + 10 : n,
      ArrowUp: n - 10 >= MIN ? n - 10 : n,
      Home: MIN,
      End: MAX,
      PageDown: Math.min(MAX, n + 10),
      PageUp: Math.max(MIN, n - 10),
    }
    if (e.key in moves) {
      e.preventDefault()
      pick(moves[e.key]!, true)
    } else if (e.key === ' ') {
      e.preventDefault()
      pick(n)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (chosen === null) pick(n)
      else e.currentTarget.closest('form')?.requestSubmit()
    }
  }

  return (
    <>
      <div className={q.guessCopy}>
        <h1 className={q.title} id={TITLE_ID}>
          ¿Qué número crees que eres?
        </h1>
        <p className={q.hint} id={HINT_ID}>
          Si España fuera 100 personas en fila, de la que menos ingresa (1) a la que más (100), ¿dónde estaría tu
          hogar? Toca tu cuadrado.
        </p>
        <div className={q.readout} aria-hidden="true">
          <span className={q.readoutLabel}>Tu respuesta</span>
          {chosen === null ? (
            <span className={q.readoutMystery}>
              <span>?</span>
            </span>
          ) : (
            <span className={q.readoutNum}>{chosen}</span>
          )}
        </div>
        <div className={q.typed}>
          <label className={q.typedLabel} htmlFor="cien-numero">
            O escribe tu número, del 1 al 99
          </label>
          <input
            id="cien-numero"
            className={q.typedInput}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={draft}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
              setDraft(digits)
              const n = Number(digits)
              if (digits && n >= MIN && n <= MAX) pick(n)
            }}
            onBlur={() => setDraft(chosen === null ? '' : String(chosen))}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
        {attempted && chosen === null && (
          <p className={cx(q.msg, q.msgError)} role="alert">
            Elige un cuadrado o escribe un número del 1 al 99.
          </p>
        )}
      </div>

      <div className={q.guessBoard}>
        <div className={q.rowNums} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
            <span key={r}>{pad2(r * 10 + 1)}</span>
          ))}
        </div>
        <div
          className={q.pickGrid}
          role="radiogroup"
          aria-labelledby={TITLE_ID}
          aria-describedby={HINT_ID}
          onKeyDown={onKeyDown}
        >
          {HUNDRED.map((n) =>
            n > MAX ? (
              <span key={n} className={cx(q.pick, q.pickOff)} aria-hidden="true" />
            ) : (
              <button
                type="button"
                key={n}
                ref={(el) => {
                  squares.current[n] = el
                }}
                role="radio"
                aria-checked={chosen === n}
                aria-label={String(n)}
                tabIndex={n === focusN ? 0 : -1}
                data-main={n === focusN ? '' : undefined}
                className={cx(
                  q.pick,
                  chosen !== null && n < chosen && q.pickBelow,
                  chosen === n && q.pickOn
                )}
                onClick={() => pick(n)}
                onFocus={() => setFocusN(n)}
              >
                <span className={q.pickNum}>{n}</span>
              </button>
            )
          )}
        </div>
        <div className={q.guessAxis} aria-hidden="true">
          <span>1 · menos ingresos</span>
          <span>más ingresos · 100</span>
        </div>
      </div>
    </>
  )
}
