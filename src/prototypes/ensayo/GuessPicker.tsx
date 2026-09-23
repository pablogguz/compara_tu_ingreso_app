'use client'

import { useRef, useState } from 'react'
import { LIMITS } from '@/prototypes/shared/useFlow'
import { cx } from './copy'
import q from './Questions.module.css'

const { min: MIN, max: MAX } = LIMITS.perceived
const HUNDRED = Array.from({ length: 100 }, (_, i) => i + 1)
/** squares 2…100 can be chosen: square k means k − 1 people below you */
const FIRST = MIN + 1
const LAST = MAX + 1

interface GuessPickerProps {
  /** the guess, 1…99: how many of the hundred live in households with less than yours */
  value: number
  /** a square has been chosen (the flow's default is never shown as an answer) */
  touched: boolean
  attempted: boolean
  onPick: (n: number) => void
  labelledBy: string
}

const below = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'} por debajo`

// The guess: pick a square on the 10 × 10 grid or move the slider; the two
// stay in sync. A guess of g means g people below you, so its square is
// g + 1: square 1 cannot be chosen (somebody is always the first) and
// square 100 means 99 below. The grid is a radio group with a roving
// tabindex: ←→ move by one, ↑↓ by a row, Home/End to the ends; Enter goes on.
export default function GuessPicker({ value, touched, attempted, onPick, labelledBy }: GuessPickerProps) {
  const chosen = touched ? value : null
  const chosenSquare = chosen === null ? null : chosen + 1
  const [focusK, setFocusK] = useState(touched ? value + 1 : 51)
  const squares = useRef<Array<HTMLButtonElement | null>>([])

  /** choose square k (2…100), i.e. a guess of k − 1 */
  const pickSquare = (k: number, focus = false) => {
    const c = Math.max(FIRST, Math.min(LAST, k))
    setFocusK(c)
    onPick(c - 1)
    if (focus) squares.current[c]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = focusK
    const moves: Record<string, number> = {
      ArrowRight: k + 1,
      ArrowLeft: k - 1,
      ArrowDown: k + 10 <= LAST ? k + 10 : k,
      ArrowUp: k - 10 >= FIRST ? k - 10 : k,
      Home: FIRST,
      End: LAST,
    }
    if (e.key in moves) {
      e.preventDefault()
      pickSquare(moves[e.key], true)
    } else if (e.key === ' ') {
      e.preventDefault()
      pickSquare(k)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (chosen === null) pickSquare(k)
      else e.currentTarget.closest('form')?.requestSubmit()
    }
  }

  return (
    <div className={q.guess}>
      <p className={cx(q.hint, q.guessHint)} id="ensayo-guess-hint">
        Arriba a la izquierda, la persona que vive en el hogar con menos ingresos; abajo a la derecha, la que vive en el
        que más. Elige el cuadrado que crees que eres tú, o mueve el control.
      </p>

      <div className={q.guessBoard}>
        <span className={q.guessEnd} aria-hidden="true">
          menos ingresos
        </span>
        <div
          className={q.guessGrid}
          role="radiogroup"
          aria-labelledby={labelledBy}
          aria-describedby="ensayo-guess-hint"
          onKeyDown={onKeyDown}
        >
          {HUNDRED.map((k) =>
            k < FIRST ? (
              // the first square: always somebody's, below any guess
              <span key={k} className={cx(q.gsq, q.gsqOff, chosen !== null && q.gsqBelow)} aria-hidden="true" />
            ) : (
              <button
                type="button"
                key={k}
                ref={(el) => {
                  squares.current[k] = el
                }}
                role="radio"
                aria-checked={chosenSquare === k}
                aria-label={below(k - 1)}
                tabIndex={k === focusK ? 0 : -1}
                data-main={k === focusK ? '' : undefined}
                className={cx(
                  q.gsq,
                  chosenSquare !== null && k < chosenSquare && q.gsqBelow,
                  chosenSquare === k && q.gsqOn
                )}
                onClick={() => pickSquare(k)}
                onFocus={() => setFocusK(k)}
              >
                <span className={cx(q.gsqNum, chosenSquare === k && q.gsqYou)}>{chosenSquare === k ? '¿Tú?' : k - 1}</span>
              </button>
            )
          )}
        </div>
        <span className={cx(q.guessEnd, q.guessEndRight)} aria-hidden="true">
          más ingresos
        </span>
      </div>

      <div className={q.guessRead} aria-live="polite">
        <span className={q.guessReadLabel}>Tu estimación</span>
        <span className={cx(q.guessReadValue, chosen === null && q.guessReadEmpty)}>{chosen === null ? '—' : chosen}</span>
        <span className={q.guessReadNote}>
          {chosen === null
            ? 'Aún no has elegido.'
            : `Crees que ${chosen} de cada 100 personas viven en hogares con menos ingresos que el tuyo.`}
        </span>
      </div>

      <div className={q.guessSlider}>
        <label className={q.sliderLabel} htmlFor="ensayo-guess-slider">
          O desliza, del 1 al 99
        </label>
        <input
          id="ensayo-guess-slider"
          className={cx(q.slider, chosen === null && q.sliderUnset)}
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={chosen ?? 50}
          aria-valuetext={chosen === null ? 'Sin elegir' : below(chosen)}
          style={{ ['--fill' as string]: `${(((chosen ?? 50) - MIN) / (MAX - MIN)) * 100}%` } as React.CSSProperties}
          onChange={(e) => pickSquare(Number(e.target.value) + 1)}
          // a tap on the thumb at its resting place is a choice too
          onClick={(e) => {
            if (chosen === null) pickSquare(Number(e.currentTarget.value) + 1)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (chosen === null) pickSquare(Number(e.currentTarget.value) + 1)
              else e.currentTarget.closest('form')?.requestSubmit()
            }
          }}
        />
        {attempted && chosen === null && (
          <p className={cx(q.msg, q.msgError)} role="alert">
            Elige un cuadrado o mueve el control para seguir.
          </p>
        )}
      </div>
    </div>
  )
}
