'use client'

import { useEffect, useState } from 'react'

// The results screen reveals itself in acts. The hero card's own elements are
// choreographed in CSS (delayed keyframes in styles_results.css); the two
// heavier pieces — the Highcharts plot and the stats cards — are mounted here,
// on the same clock, so their entrance animations start exactly when the
// story reaches them instead of running behind an invisible container.
export type RevealAct = 'hero' | 'chart' | 'stats' | 'done'

const ORDER: RevealAct[] = ['hero', 'chart', 'stats', 'done']

export interface RevealSchedule {
  /** ms after mount at which the chart mounts */
  chart: number
  /** ms after mount at which the stats row + actions mount */
  stats: number
  /** ms after mount at which the intro is considered over */
  done: number
}

export function hasReached(act: RevealAct, target: RevealAct): boolean {
  return ORDER.indexOf(act) >= ORDER.indexOf(target)
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useRevealSequence(schedule: RevealSchedule): RevealAct {
  const [act, setAct] = useState<RevealAct>(() =>
    prefersReducedMotion() ? 'done' : 'hero'
  )

  useEffect(() => {
    if (prefersReducedMotion()) {
      setAct('done')
      return
    }
    const timers = [
      window.setTimeout(() => setAct('chart'), schedule.chart),
      window.setTimeout(() => setAct('stats'), schedule.stats),
      window.setTimeout(() => setAct('done'), schedule.done),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
    // The schedule is a module constant; a new object identity per render
    // must not restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return act
}
