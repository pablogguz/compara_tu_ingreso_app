'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import App, { type AppBoot } from '@/components/App'
import { loadMunicipalityLookup } from '@/lib/dataLoader'
import { computeResults } from '@/lib/computeResults'
import { SCENARIOS, findScenario, type MockScenario } from './scenarios'

const COLLAPSED_KEY = 'mockBarCollapsed'

const href = (s: MockScenario) => `/mocks/${s.id}/`

// Results scenarios carry answers, not numbers: run them through the same
// calculation as the live questionnaire against the real Arrow data.
async function resolveBoot(scenario: MockScenario): Promise<AppBoot> {
  if (!scenario.answers) return scenario.boot
  const { perceivedPercentile, ...query } = scenario.answers
  const municipalities = await loadMunicipalityLookup()
  const results = await computeResults(query, municipalities)
  return {
    ...scenario.boot,
    userInput: {
      municipality: query.municipality,
      monthlyIncome: query.monthlyIncome,
      adults: query.adults,
      children: query.children,
      perceivedPercentile,
    },
    results,
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return (
    el.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
    el.getAttribute('role') === 'slider'
  )
}

export default function MockScreen({ id }: { id: string }) {
  const router = useRouter()
  const scenario = findScenario(id) ?? SCENARIOS[0]
  const index = SCENARIOS.indexOf(scenario)
  const prev = SCENARIOS[(index - 1 + SCENARIOS.length) % SCENARIOS.length]
  const next = SCENARIOS[(index + 1) % SCENARIOS.length]

  const [boot, setBoot] = useState<AppBoot | null>(scenario.answers ? null : scenario.boot)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  // ?clean hides the bar entirely (for screenshots)
  const [clean, setClean] = useState(false)

  useEffect(() => {
    setCollapsed(readCollapsed())
    setClean(new URLSearchParams(window.location.search).has('clean'))
  }, [])

  useEffect(() => {
    let cancelled = false
    resolveBoot(scenario)
      .then((b) => !cancelled && setBoot(b))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [scenario])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable: the choice just won't persist */
      }
      return !c
    })
  }, [])

  const replay = useCallback(() => setRun((r) => r + 1), [])

  // ← / → switch screens, R replays the entrance, H hides the bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      if (e.key === 'ArrowRight') router.push(href(next))
      else if (e.key === 'ArrowLeft') router.push(href(prev))
      else if (e.key === 'r' || e.key === 'R') replay()
      else if (e.key === 'h' || e.key === 'H') toggleCollapsed()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, next, prev, replay, toggleCollapsed])

  return (
    <>
      {!clean && (
      <nav className={`mock-bar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Maquetas">
        <Link className="mock-bar__btn" href="/mocks/" title="Todas las maquetas">
          <i className="fas fa-grip" aria-hidden="true"></i>
          <span className="visually-hidden">Todas las maquetas</span>
        </Link>
        <Link className="mock-bar__btn" href={href(prev)} title={`← ${prev.title}`}>
          <i className="fas fa-chevron-left" aria-hidden="true"></i>
          <span className="visually-hidden">Anterior: {prev.title}</span>
        </Link>
        <div className="mock-bar__label">
          <span className="mock-bar__group">{scenario.group}</span>
          <span className="mock-bar__title">{scenario.title}</span>
        </div>
        <span className="mock-bar__count">
          {index + 1}/{SCENARIOS.length}
        </span>
        <Link className="mock-bar__btn" href={href(next)} title={`${next.title} →`}>
          <i className="fas fa-chevron-right" aria-hidden="true"></i>
          <span className="visually-hidden">Siguiente: {next.title}</span>
        </Link>
        <button type="button" className="mock-bar__btn" onClick={replay} title="Repetir entrada (R)">
          <i className="fas fa-rotate-right" aria-hidden="true"></i>
          <span className="visually-hidden">Repetir entrada</span>
        </button>
        <button type="button" className="mock-bar__btn" onClick={toggleCollapsed} title="Ocultar (H)">
          <i className="fas fa-chevron-down" aria-hidden="true"></i>
          <span className="visually-hidden">Ocultar barra</span>
        </button>
        <button type="button" className="mock-bar__tab" onClick={toggleCollapsed}>
          Maquetas
        </button>
      </nav>
      )}

      {error ? (
        <div className="mock-loading" role="alert">
          No se pudo preparar la maqueta: {error}
        </div>
      ) : boot ? (
        <App key={run} boot={boot} mock />
      ) : (
        <div className="mock-loading">Preparando maqueta…</div>
      )}
    </>
  )
}
