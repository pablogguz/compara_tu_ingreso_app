'use client'

import { useEffect, useRef, useState } from 'react'

export interface CountUpOptions {
  /** Wait this long before the very first count starts (ms). Later target
   *  changes animate immediately. */
  delay?: number
  /** Duration for target changes after the first count (ms). Defaults to
   *  `duration`. */
  updateDuration?: number
}

// easeOutCubic: fast start, decelerating tail so the last few digits tick
// into place. (Quint lands too early: the rounded value reaches the target
// around 65% of the duration, well before the CSS beat that follows it.)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// Animate a numeric value towards `target`. The first run counts from 0; later
// target changes count from wherever the value currently is, so toggling
// between views glides between percentiles instead of restarting at 0.
// Honors prefers-reduced-motion by jumping straight to the target.
export function useCountUp(
  target: number,
  duration = 1100,
  options: CountUpOptions = {}
): number {
  const { delay = 0, updateDuration = duration } = options
  const [value, setValue] = useState(0)
  const valueRef = useRef(0)
  const firstRun = useRef(true)

  useEffect(() => {
    const commit = (v: number) => {
      valueRef.current = v
      setValue(v)
    }

    if (typeof window === 'undefined') {
      commit(target)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = valueRef.current
    if (reduced || target === from) {
      firstRun.current = false
      commit(target)
      return
    }

    const isFirst = firstRun.current
    const runDuration = isFirst ? duration : updateDuration
    const startAt = performance.now() + (isFirst ? delay : 0)
    const distance = target - from

    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - startAt
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      // The first run is only "spent" once it has drawn a frame. React's
      // StrictMode mounts, unmounts and remounts effects in development;
      // flagging it earlier would make the remount skip the intro timing.
      firstRun.current = false
      const t = Math.min(elapsed / runDuration, 1)
      commit(Math.round(from + distance * easeOut(t)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // `delay` / `updateDuration` only matter at the moment a run starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}
