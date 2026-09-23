'use client'

import { YEAR } from './copy'
import { cx } from './ui'
import s from './Stamp.module.css'

interface StampProps {
  /** "calculado": the red result stamp; "recibido": the registry's date stamp */
  variant: 'calculado' | 'recibido'
  percentile?: number
  date?: string
  /** press it down on mount (skipped with prefers-reduced-motion) */
  animate?: boolean
  className?: string
}

// A rubber stamp, inked through the #cti-tinta filter that App defines once.
export default function Stamp({ variant, percentile, date, animate = true, className }: StampProps) {
  const red = variant === 'calculado'
  return (
    <div className={cx(s.stamp, red ? s.red : s.ink, animate && s.press, className)} aria-hidden="true">
      <span className={s.top}>{red ? 'Calculado' : 'Registro de entrada'}</span>
      <span className={s.big}>{red ? `P·${percentile ?? ''}` : 'Recibido'}</span>
      <span className={s.bottom}>{red ? `Ejercicio ${YEAR}` : date}</span>
    </div>
  )
}

/** The ink texture of the stamps (render once, anywhere in the tree). */
export function StampInk() {
  return (
    <svg width="0" height="0" className={s.defs} aria-hidden="true" focusable="false">
      <filter id="cti-tinta" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="grain" />
        <feColorMatrix
          in="grain"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.8 2.45"
          result="mask"
        />
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      </filter>
    </svg>
  )
}
