'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { euro, num } from '@/prototypes/shared/format'
import type { Flow } from '@/prototypes/shared/useFlow'
import { cx } from './ui'
import q from './Question.module.css'

const ID = 'cien-ingresos'

/** The validation copy without its leading emoji: the red square marks it here. */
const clean = (message: string) => message.replace(/^[^\p{L}\p{N}]+/u, '')

export default function StepIncome({ flow, attempted }: { flow: Flow; attempted: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  // an invisible copy of the figure: the field is exactly as wide as what it
  // holds, so the € sits right after the number (and follows the webfont)
  const mirror = useRef<HTMLSpanElement>(null)
  // digits before the caret, to put it back after the thousands dots move
  const caret = useRef<number | null>(null)
  const value = flow.answers.monthlyIncome
  const text = typeof value === 'number' ? num(value) : ''
  const periods = flow.answers.paymentPeriods

  useLayoutEffect(() => {
    const el = input.current
    if (caret.current === null || !el) return
    let seen = 0
    let i = 0
    while (i < el.value.length && seen < caret.current) {
      if (/\d/.test(el.value[i])) seen++
      i++
    }
    el.setSelectionRange(i, i)
    caret.current = null
  })

  useEffect(() => {
    const m = mirror.current
    const el = input.current
    if (!m || !el) return
    const fit = () => {
      // plus room for the caret, so the field never scrolls its first digit away
      const slack = parseFloat(getComputedStyle(el).fontSize) * 0.12
      el.style.width = `${Math.ceil(m.getBoundingClientRect().width + slack)}px`
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(m)
    return () => ro.disconnect()
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const at = e.target.selectionStart ?? raw.length
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6)
    caret.current = raw.slice(0, at).replace(/\D/g, '').replace(/^0+/, '').length
    flow.set('monthlyIncome', digits ? Number(digits) : '')
  }

  const v = flow.income
  const message =
    v.state === 'invalid' || v.state === 'warning'
      ? { text: clean(v.message), error: v.state === 'invalid' }
      : v.state === 'empty' && attempted
        ? { text: 'Escribe cuánto entra en casa cada mes.', error: true }
        : null

  return (
    <>
      <h1 className={q.title}>
        <label htmlFor={ID}>
          ¿Cuánto entra en casa al mes?<span className={q.srOnly}> (en euros)</span>
        </label>
      </h1>
      <p className={q.hint} id={`${ID}-hint`}>
        Neto, sumando a todas las personas del hogar.
      </p>

      <div className={q.moneyRow}>
        <span className={q.moneyField}>
          <span ref={mirror} className={cx(q.money, q.moneyMirror)} aria-hidden="true">
            {text || '0'}
          </span>
          <input
          ref={input}
          id={ID}
          data-main=""
          className={q.money}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={text}
          onChange={onChange}
          aria-invalid={v.state === 'invalid' || undefined}
          aria-describedby={`${ID}-hint ${ID}-year${message ? ` ${ID}-msg` : ''}`}
          />
        </span>
        <span className={q.euro} aria-hidden="true">
          €
        </span>
      </div>

      <div className={q.pagasRow}>
        <div className={q.toggle} role="group" aria-label="Pagas al año">
          {([12, 14] as const).map((p) => (
            <button
              type="button"
              key={p}
              className={q.toggleBtn}
              aria-pressed={periods === p}
              onClick={() => flow.set('paymentPeriods', p)}
            >
              {p} pagas
            </button>
          ))}
        </div>
        <span className={q.year} id={`${ID}-year`}>
          {flow.annualIncome !== null ? `= ${euro(flow.annualIncome)} al año` : '= … € al año'}
        </span>
      </div>

      {message && (
        <p
          id={`${ID}-msg`}
          className={cx(q.msg, message.error && q.msgError)}
          role={message.error ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </>
  )
}
