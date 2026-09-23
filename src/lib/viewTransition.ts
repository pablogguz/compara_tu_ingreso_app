import { flushSync } from 'react-dom'

// Screens and question steps change inside document.startViewTransition so
// the outgoing frame can rack out of focus while the incoming one plays its
// own entrance (see "Stage + view transitions" in public/css/styles.css).
//
// <html data-vt> tells the CSS which kind of change is running; <html
// data-nav> which way it goes. data-nav is also read by the step entrance
// keyframes, so it is set even when the API is missing (jsdom, older
// browsers) and the update simply runs straight away.

export type TransitionKind = 'stage' | 'step'
export type NavDirection = 'forward' | 'back'

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function runViewTransition(
  update: () => void,
  kind: TransitionKind,
  direction: NavDirection = 'forward'
): void {
  if (typeof document === 'undefined') {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.nav = direction

  const doc = document as ViewTransitionDocument
  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    update()
    return
  }

  root.dataset.vt = kind
  const transition = doc.startViewTransition(() => flushSync(update))
  const cleanup = () => {
    if (root.dataset.vt === kind) delete root.dataset.vt
  }
  transition.finished.then(cleanup, cleanup)
}
