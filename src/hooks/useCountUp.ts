'use client'

import { useEffect, useState } from 'react'

// Animate a numeric value from 0 → target with easeOutCubic.
// Honors prefers-reduced-motion by jumping straight to the target.
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setValue(target)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || target === 0) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start)
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
