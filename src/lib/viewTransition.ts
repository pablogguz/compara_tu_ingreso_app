'use client'

import { flushSync } from 'react-dom'

type VTDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

/**
 * Changes scene: `setState` updates React state (flushed synchronously, so the
 * browser can snapshot the new frame) and `after` may then move the page, e.g.
 * jump to the new scene. With the View Transitions API the old frame fades out
 * while the new one rises in (public/css/styles.css, html[data-vt="scene"]), so
 * the reader never sees the page scroll between scenes; elsewhere, and with
 * reduced motion, the change is immediate. Always asynchronous, so it can be
 * called from an effect.
 */
export function sceneChange(setState: () => void, after?: () => void) {
  const root = document.documentElement
  // the site's CSS scrolls smoothly (for in-page links); a scene change must
  // land exactly, so smooth scrolling is off until it is over
  const smooth = root.style.scrollBehavior
  const run = () => {
    root.style.scrollBehavior = 'auto'
    flushSync(setState)
    after?.()
  }
  const settle = () => {
    root.style.scrollBehavior = smooth
    if (root.dataset.vt === 'scene') delete root.dataset.vt
  }
  const doc = document as VTDocument
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (typeof doc.startViewTransition !== 'function' || reduced) {
    setTimeout(() => {
      run()
      settle()
    }, 0)
    return
  }
  root.dataset.vt = 'scene'
  doc.startViewTransition(run).finished.catch(() => {}).finally(settle)
}

/** Puts an element at the top of the viewport at once (no smooth scrolling). */
export function jumpTo(el: Element | null | undefined) {
  el?.scrollIntoView?.({ block: 'start', behavior: 'instant' as ScrollBehavior })
}
