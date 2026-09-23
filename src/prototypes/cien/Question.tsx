'use client'

import { useEffect, useRef, useState } from 'react'
import { HUNDRED, Arrow, cx, pad2 } from './ui'
import a from './App.module.css'
import s from './Question.module.css'

interface QuestionProps {
  /** 0…3 */
  step: number
  topic: string
  /** the answer on this screen is complete */
  valid: boolean
  onBack: () => void
  onNext: () => void
  nextLabel: string
  /** 'default': question + aside grid; 'wide': the step lays out its own
   *  12 columns (household); 'guess': the grid takes half the poster */
  layout: 'default' | 'wide' | 'guess'
  children: (attempted: boolean) => React.ReactNode
}

// One question per screen: counter + 4-segment progress on top, the giant
// question, its control, and "Atrás / Siguiente" on a rule at the bottom.
// Enter submits the form (native implicit submission from any text field;
// the guess grid calls requestSubmit itself).
export default function Question({ step, topic, valid, onBack, onNext, nextLabel, layout, children }: QuestionProps) {
  const form = useRef<HTMLFormElement>(null)
  const [attempted, setAttempted] = useState(false)

  const focusMain = () => {
    const el = form.current?.querySelector<HTMLElement>('[data-main], [role="combobox"]')
    el?.focus({ preventScroll: true })
  }

  useEffect(() => {
    setAttempted(false)
    // after the step's own effects have run, so the control exists
    const id = requestAnimationFrame(focusMain)
    return () => cancelAnimationFrame(id)
  }, [step])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (valid) onNext()
    else {
      setAttempted(true)
      focusMain()
    }
  }

  return (
    <div className={a.screen}>
      <header className={s.head}>
        <div className={s.headRow}>
          <span className={a.brand}>Compara tu ingreso</span>
          <span className={s.count}>
            <span className={s.countNow}>{pad2(step + 1)}</span> / 04 · {topic}
          </span>
        </div>
        <div
          className={s.progress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={step + 1}
          aria-label={`Pregunta ${step + 1} de 4`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx(s.seg, i < step && s.segDone, i === step && s.segNow)} />
          ))}
        </div>
      </header>

      <form ref={form} className={s.form} onSubmit={submit} noValidate>
        <div key={step} className={cx(s.main, layout !== 'default' && s.mainGrid)}>
          <div className={s.body}>{children(attempted)}</div>
          {layout === 'default' && (
            <aside className={s.aside} aria-hidden="true">
              <div className={s.asideGrid}>
                {HUNDRED.map((n) => (
                  <span key={n} className={s.asideSq} />
                ))}
              </div>
              <p className={s.asideNote}>Tu cuadrado aparecerá al final.</p>
            </aside>
          )}
        </div>

        <div className={s.foot}>
          <button type="button" className={s.back} onClick={onBack}>
            <Arrow left className={s.backIcon} />
            Atrás
          </button>
          <div className={s.footRight}>
            <span className={s.enter} aria-hidden="true">
              o pulsa Intro
            </span>
            <button type="submit" className={cx(a.btn, s.next)} aria-disabled={!valid || undefined}>
              {nextLabel}
              <Arrow className={a.btnIcon} />
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
