import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from '@/hooks/useCountUp'

// jsdom does not run requestAnimationFrame on its own, so we drive the loop
// manually by stubbing rAF + performance.now() and stepping through frames.

describe('useCountUp', () => {
  let now = 0
  let rafCallbacks: Array<(t: number) => void> = []

  beforeEach(() => {
    now = 0
    rafCallbacks = []
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function tick(advanceMs: number) {
    now += advanceMs
    const cbs = rafCallbacks
    rafCallbacks = []
    cbs.forEach((cb) => cb(now))
  }

  it('starts at 0', () => {
    const { result } = renderHook(() => useCountUp(50, 100))
    expect(result.current).toBe(0)
  })

  it('reaches the target after the duration elapses', () => {
    const { result } = renderHook(() => useCountUp(42, 100))
    act(() => {
      tick(50)
      tick(50)
      tick(10)
    })
    expect(result.current).toBe(42)
  })

  it('produces a non-decreasing sequence as time advances', () => {
    const { result } = renderHook(() => useCountUp(100, 200))
    const samples: number[] = [result.current]
    for (let i = 0; i < 10; i++) {
      act(() => tick(25))
      samples.push(result.current)
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1])
    }
    expect(samples[samples.length - 1]).toBe(100)
  })

  it('jumps to 0 immediately when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0, 100))
    expect(result.current).toBe(0)
  })
})

describe('useCountUp — subsequent targets and delay', () => {
  let now = 0
  let rafCallbacks: Array<(t: number) => void> = []

  beforeEach(() => {
    now = 0
    rafCallbacks = []
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function tick(advanceMs: number) {
    now += advanceMs
    const cbs = rafCallbacks
    rafCallbacks = []
    cbs.forEach((cb) => cb(now))
  }

  it('holds at 0 during the initial delay, then counts', () => {
    const { result } = renderHook(() => useCountUp(80, 100, { delay: 50 }))
    act(() => tick(25))
    expect(result.current).toBe(0)
    act(() => {
      tick(25)
      tick(50)
      tick(50)
      tick(10)
    })
    expect(result.current).toBe(80)
  })

  it('counts from the current value when the target changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, 100, { updateDuration: 100 }),
      { initialProps: { target: 80 } }
    )
    act(() => {
      tick(50)
      tick(50)
      tick(10)
    })
    expect(result.current).toBe(80)

    rerender({ target: 20 })
    act(() => tick(20))
    // on the way down, not restarting from 0
    expect(result.current).toBeLessThan(80)
    expect(result.current).toBeGreaterThan(20)
    act(() => {
      tick(50)
      tick(50)
    })
    expect(result.current).toBe(20)
  })
})
