import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { useRevealSequence, hasReached } from '@/hooks/useRevealSequence'
import { REVEAL } from '@/components/ResultsView'

const schedule = { chart: 100, stats: 200, done: 300 }

describe('hasReached', () => {
  it('orders the acts hero → chart → stats → done', () => {
    expect(hasReached('hero', 'chart')).toBe(false)
    expect(hasReached('chart', 'chart')).toBe(true)
    expect(hasReached('stats', 'chart')).toBe(true)
    expect(hasReached('done', 'stats')).toBe(true)
    expect(hasReached('stats', 'done')).toBe(false)
  })
})

describe('useRevealSequence', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('advances through the acts on the schedule', () => {
    const { result } = renderHook(() => useRevealSequence(schedule))
    expect(result.current).toBe('hero')
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('chart')
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('stats')
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('done')
  })

  it('clears its timers on unmount', () => {
    const { result, unmount } = renderHook(() => useRevealSequence(schedule))
    unmount()
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe('hero')
  })

  it('skips straight to done under prefers-reduced-motion', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    try {
      const { result } = renderHook(() => useRevealSequence(schedule))
      expect(result.current).toBe('done')
    } finally {
      window.matchMedia = original
    }
  })
})

// The hero's CSS cascade waits for the JS count-up to land. Both sides of
// that handshake are plain numbers in two files; make sure they agree.
describe('intro timeline: CSS mirrors ResultsView.REVEAL', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'css', 'styles_results.css'),
    'utf8'
  )
  const token = (name: string) => {
    const m = css.match(new RegExp(`${name}:\\s*(\\d+)ms`))
    if (!m) throw new Error(`${name} not found in styles_results.css`)
    return parseInt(m[1], 10)
  }

  it('--t-count-start equals REVEAL.countDelay', () => {
    expect(token('--t-count-start')).toBe(REVEAL.countDelay)
  })

  it('--t-land equals countDelay + countDuration', () => {
    expect(token('--t-land')).toBe(REVEAL.countDelay + REVEAL.countDuration)
  })

  it('the chart mounts after the hero cascade and before the intro ends', () => {
    const land = REVEAL.countDelay + REVEAL.countDuration
    expect(REVEAL.chart).toBeGreaterThan(land)
    expect(REVEAL.stats).toBeGreaterThan(REVEAL.chart)
    expect(REVEAL.done).toBeGreaterThan(REVEAL.stats)
  })
})
