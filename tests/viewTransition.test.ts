import { describe, it, expect, afterEach, vi } from 'vitest'
import { runViewTransition } from '@/lib/viewTransition'

const root = () => document.documentElement

afterEach(() => {
  delete (document as any).startViewTransition
  delete root().dataset.vt
  delete root().dataset.nav
})

describe('runViewTransition', () => {
  it('runs the update straight away when the API is missing (jsdom, older browsers)', () => {
    const update = vi.fn()
    runViewTransition(update, 'step', 'back')
    expect(update).toHaveBeenCalledTimes(1)
    // direction is still published: the CSS entrance keyframes read it
    expect(root().dataset.nav).toBe('back')
    expect(root().dataset.vt).toBeUndefined()
  })

  it('wraps the update in a view transition and labels its kind while it runs', async () => {
    let finish!: () => void
    const finished = new Promise<void>((r) => (finish = r))
    const start = vi.fn((cb: () => void) => {
      cb()
      return { finished }
    })
    ;(document as any).startViewTransition = start
    const update = vi.fn()

    runViewTransition(update, 'stage')
    expect(start).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(root().dataset.vt).toBe('stage')
    expect(root().dataset.nav).toBe('forward')

    finish()
    await finished
    await Promise.resolve()
    expect(root().dataset.vt).toBeUndefined()
  })

  it('skips the transition under prefers-reduced-motion', () => {
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
    const start = vi.fn()
    ;(document as any).startViewTransition = start
    try {
      const update = vi.fn()
      runViewTransition(update, 'step')
      expect(update).toHaveBeenCalledTimes(1)
      expect(start).not.toHaveBeenCalled()
    } finally {
      window.matchMedia = original
    }
  })
})
