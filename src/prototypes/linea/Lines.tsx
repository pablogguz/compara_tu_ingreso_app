'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Level } from '../shared/useLevels'
import { euro } from '../shared/format'
import { layoutHorizontal, layoutVertical } from './layout'
import { useArmed, useLabelMeasure, useWidth } from './hooks'
import { cx, stopPosition, type LineMeta } from './network'
import s from './Lines.module.css'

const TRAVEL_MS = 1150
const STAGGER_MS = 180

const LONG_NAMES: Record<string, string> = {
  P10: 'Percentil 10',
  P25: 'Percentil 25',
  Mediana: 'Mediana',
  P75: 'Percentil 75',
  P90: 'Percentil 90',
  P99: 'Percentil 99',
}

interface LineProps {
  level: Level
  meta: LineMeta
  /** the household's income per consumption unit */
  userValue: number
  /** the guessed stop, on L1 only */
  guess: { p: number; value: number } | null
  reduced: boolean
}

/** Text alternative for a line diagram. */
function describe(level: Level, meta: LineMeta, userValue: number, guess: LineProps['guess']): string {
  const stations = level.landmarks.map((l) => `${LONG_NAMES[l.label] ?? l.label}, ${euro(l.value)}`).join('; ')
  return (
    `${meta.code} ${level.label}. Tu parada: la ${level.percentile} de 99, con ${euro(userValue)} por unidad de consumo. ` +
    (guess ? `Creías bajarte en la ${guess.p}. ` : '') +
    `Paradas de referencia: ${stations}.`
  )
}

const pct = (p: number) => `${stopPosition(p) * 100}%`
const shiftX = (px: number) => ({ transform: `translateX(calc(-50% + ${Math.round(px)}px))` })
const shiftY = (px: number) => ({ transform: `translateY(calc(-50% + ${Math.round(px)}px))` })

/* =============================================================== horizontal */

export function HLine({ level, meta, userValue, guess, reduced, order }: LineProps & { order: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const measure = useLabelMeasure(ref)
  const armed = useArmed(reduced)
  const p = level.percentile
  const flagText = `Tú ∙ ${euro(userValue)}`
  const guessText = guess ? `Creías bajarte aquí (${guess.p})` : ''

  const layout = useMemo(
    () =>
      layoutHorizontal({
        width: width ?? 1000,
        user: p,
        guess: guess?.p ?? null,
        stations: level.landmarks.map((l) => ({
          p: l.p,
          name: measure(l.label, 'name'),
          value: measure(euro(l.value), 'value'),
        })),
        flag: measure(flagText, 'flag'),
        guessLabel: guess ? measure(guessText, 'guess') : undefined,
      }),
    [width, p, guess, level.landmarks, measure, flagText, guessText]
  )

  const delay = order * STAGGER_MS
  const up = stopPosition(p)
  const style = {
    '--line': meta.color,
    '--tint': meta.tint,
    '--delay': `${delay}ms`,
    '--travel': `${TRAVEL_MS}ms`,
    '--arrive': `${delay + TRAVEL_MS - 120}ms`,
  } as React.CSSProperties

  return (
    <div
      ref={ref}
      className={cx(s.h, armed && s.armed, layout.guess?.row === 'below' && s.hTall)}
      style={style}
      role="img"
      aria-label={describe(level, meta, userValue, guess)}
    >
      <div className={s.hTrack} />
      <div className={s.hFill} style={{ width: armed ? pct(p) : '0%' }} />

      {level.landmarks.map((l, i) => {
        const place = layout.stations[i]
        if (!place?.show) return null
        const at = stopPosition(l.p)
        const pass = delay + (at <= up ? (up > 0 ? at / up : 0) * TRAVEL_MS : TRAVEL_MS)
        return (
          <div key={l.label} className={s.hStation} style={{ left: pct(l.p) }}>
            <span className={s.hName} style={shiftX(place.nameShift)}>
              {l.label}
            </span>
            <span className={s.hStop} style={{ transitionDelay: `${Math.round(pass)}ms` }} />
            <span className={s.hValue} style={shiftX(place.valueShift)}>
              {euro(l.value)}
            </span>
          </div>
        )
      })}

      {guess && layout.guess && (
        <div
          className={cx(s.hGuess, layout.guess.ring && s.hGuessRing, layout.guess.row === 'below' && s.hGuessBelow)}
          style={{ left: pct(layout.guess.ring ? p : guess.p) }}
        >
          <span className={s.hGuessMark} />
          {layout.guess.row === 'below' && <span className={s.hLeader} />}
          <span className={s.hGuessLabel} style={shiftX(layout.guess.shift)}>
            {guessText}
          </span>
        </div>
      )}

      <div className={s.hUser} style={{ left: armed ? pct(p) : '0%' }} />
      <div className={s.hFlag} style={{ left: pct(p) }}>
        <span className={s.hFlagText} style={shiftX(layout.flagShift)}>
          {flagText}
        </span>
        <span className={s.hStem} />
      </div>
    </div>
  )
}

/* ================================================================= vertical */

export function VLine({ level, meta, userValue, guess, reduced, height }: LineProps & { height: number }) {
  const armed = useArmed(reduced)
  const [settled, setSettled] = useState(reduced)
  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setSettled(true), TRAVEL_MS + 200)
    return () => clearTimeout(t)
  }, [reduced])

  const p = level.percentile
  const layout = useMemo(
    () =>
      layoutVertical({
        height,
        user: p,
        guess: guess?.p ?? null,
        stationPs: level.landmarks.map((l) => l.p),
      }),
    [height, p, guess, level.landmarks]
  )
  const uy = layout.y(p)
  const bottom = layout.y(1)
  const style = {
    height,
    '--line': meta.color,
    '--tint': meta.tint,
    '--travel': `${settled ? 520 : TRAVEL_MS}ms`,
    '--arrive': `${settled ? 0 : TRAVEL_MS - 150}ms`,
  } as React.CSSProperties

  return (
    <div
      className={cx(s.v, armed && s.armed)}
      style={style}
      role="img"
      aria-label={describe(level, meta, userValue, guess)}
    >
      <div className={s.vTrack} />
      <div className={s.vFill} style={{ top: armed ? uy : bottom }} />

      <div key={level.key} className={s.vLabels}>
        {level.landmarks.map((l, i) => {
          const place = layout.stations[i]
          if (!place?.show) return null
          return (
            <div key={l.label} className={s.vStation} style={{ top: layout.y(l.p) }}>
              <span className={s.vStop} />
              <span className={s.vLabel} style={shiftY(place.shift)}>
                <span className={s.vName}>{LONG_NAMES[l.label] ?? l.label}</span>
                <span className={s.vValue}>{euro(l.value)}</span>
              </span>
            </div>
          )
        })}

        {guess && layout.guess && (
          <div
            className={cx(s.vGuess, layout.guess.ring && s.vGuessRing)}
            style={{ top: layout.y(layout.guess.ring ? p : guess.p) }}
          >
            <span className={s.vGuessMark} />
            <span className={s.vLabel} style={shiftY(layout.guess.shift)}>
              <span className={s.vGuessName}>Creías bajarte aquí ∙ {guess.p}</span>
              <span className={s.vValue}>{euro(guess.value)}</span>
            </span>
          </div>
        )}
      </div>

      <div className={s.vUser} style={{ top: armed ? uy : bottom }} />
      <div className={s.vUserLabel} style={{ top: uy }}>
        <span className={s.vLabel} style={shiftY(layout.userShift)}>
          <span className={s.vUserName}>Tú ∙ parada {p}</span>
          <span className={s.vValue}>{euro(userValue)}</span>
        </span>
      </div>
    </div>
  )
}
