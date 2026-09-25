'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/** A media query, kept up to date (false on the server and where matchMedia is missing). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useIsoLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [query])
  return matches
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/** The rendered size of an element, kept up to date with a ResizeObserver. */
export function useSize<T extends HTMLElement>(fallback: { width: number; height: number }) {
  const ref = useRef<T>(null)
  const [size, setSize] = useState(fallback)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      const width = Math.round(r.width)
      const height = Math.round(r.height)
      if (width > 0 && height > 0) {
        setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
      }
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, size] as const
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * Animates an array of numbers towards `target` (same length) with
 * requestAnimationFrame; jumps straight there when `instant`.
 */
export function useTweenedArray(target: number[], duration: number, instant: boolean): number[] {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const from = current.current
    const same = from.length === target.length && from.every((v, i) => Math.abs(v - target[i]) < 1e-6)
    if (same) return
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    if (instant || from.length !== target.length || typeof requestAnimationFrame === 'undefined') {
      current.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const k = easeInOut(t)
      const next = target.map((v, i) => from[i] + (v - from[i]) * k)
      current.current = next
      setValue(next)
      frame.current = t < 1 ? requestAnimationFrame(tick) : null
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [target, duration, instant])

  return value
}

/** Counts up to `to` over `duration` ms once `run` turns true; shows `to` at once when `instant`. */
export function useCount(to: number, run: boolean, duration: number, instant: boolean): number {
  const [n, setN] = useState(run ? to : 0)
  useEffect(() => {
    if (!run) {
      setN(0)
      return
    }
    if (instant || typeof requestAnimationFrame === 'undefined') {
      setN(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setN(Math.round(to * (1 - (1 - t) ** 2)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, run, duration, instant])
  return n
}

/**
 * Reveals an element the first time it scrolls into view: returns a ref and
 * whether it has been seen. Without IntersectionObserver (tests, old
 * browsers) everything is shown at once.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown] as const
}
