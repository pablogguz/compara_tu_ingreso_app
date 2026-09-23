'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const on = () => setMatches(mql.matches)
    on()
    mql.addEventListener?.('change', on)
    return () => mql.removeEventListener?.('change', on)
  }, [query])
  return matches
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** Width of an element, kept up to date with a ResizeObserver. */
export function useWidth<T extends HTMLElement>(): [RefObject<T>, number | null] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState<number | null>(null)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width || null)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** true one frame after mount (or at once when motion is reduced): a trigger for entry transitions. */
export function useArmed(reduced: boolean): boolean {
  const [armed, setArmed] = useState(reduced)
  useEffect(() => {
    if (reduced) {
      setArmed(true)
      return
    }
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setArmed(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [reduced])
  return armed
}

/** Counts from 1 up to `target` over `ms` (ease-out); jumps straight there when reduced. */
export function useCountUp(target: number, ms: number, delay: number, reduced: boolean): number {
  const [value, setValue] = useState(reduced ? target : 1)
  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const k = Math.min(1, Math.max(0, (t - start - delay) / ms))
      const eased = 1 - Math.pow(1 - k, 3)
      setValue(Math.max(1, Math.round(1 + (target - 1) * eased)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, delay, reduced])
  return value
}

/* ---------------------------------------------------------- text measuring */

export type LabelKind = 'name' | 'value' | 'flag' | 'guess'

// Mirrors the label styles in Lines.module.css. `em` is the fallback average
// advance (used before fonts load, and in tests).
const LABELS: Record<LabelKind, { size: number; weight: number; mono: boolean; italic: boolean; em: number; pad: number }> = {
  name: { size: 13, weight: 800, mono: false, italic: false, em: 0.62, pad: 2 },
  value: { size: 13, weight: 600, mono: true, italic: false, em: 0.62, pad: 6 },
  flag: { size: 15, weight: 900, mono: false, italic: false, em: 0.64, pad: 2 },
  guess: { size: 14, weight: 600, mono: false, italic: true, em: 0.56, pad: 6 },
}

let canvas: HTMLCanvasElement | null = null

function context(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null
  canvas ??= document.createElement('canvas')
  return canvas.getContext('2d')
}

/**
 * A function that returns the rendered width of a label, measured with the
 * real fonts once they have loaded (re-measures when they arrive).
 */
export function useLabelMeasure(ref: RefObject<HTMLElement>): (text: string, kind: LabelKind) => number {
  const [fontsVersion, setFontsVersion] = useState(0)
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => alive && setFontsVersion((v) => v + 1))
    return () => {
      alive = false
    }
  }, [])

  return useCallback(
    (text: string, kind: LabelKind) => {
      const spec = LABELS[kind]
      const estimate = text.length * spec.size * spec.em + spec.pad
      const el = ref.current
      const ctx = context()
      if (!el || !ctx) return estimate
      const family = getComputedStyle(el)
        .getPropertyValue(spec.mono ? '--font-overpass-mono' : '--font-overpass')
        .trim()
      if (!family) return estimate
      ctx.font = `${spec.italic ? 'italic ' : ''}${spec.weight} ${spec.size}px ${family}`
      return Math.ceil(ctx.measureText(text).width) + spec.pad
    },
    // fontsVersion: measure again once the web fonts are in
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref, fontsVersion]
  )
}
