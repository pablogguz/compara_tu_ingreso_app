'use client'

import { useEffect, useRef, useState } from 'react'
import { DataProvider } from '@/lib/DataContext'
import { useFlow, type Flow } from '../shared/useFlow'
import { useLevels } from '../shared/useLevels'
import Masthead from './Masthead'
import Frase, { INITIAL_DRAFTS, type Drafts } from './Frase'
import Imprenta from './Imprenta'
import Articulo from './Articulo'
import Erratas from './Erratas'
import Metodologia from './Metodologia'
import s from './App.module.css'

const PAPER = '#f2eee4'

// A · Portada — the app as a newspaper front page. The questionnaire is one
// sentence with blanks; the result reads like a feature article.
export default function PortadaApp() {
  return (
    <DataProvider>
      <Portada />
    </DataProvider>
  )
}

function Portada() {
  const flow = useFlow({ minLoadingMs: 1500 })
  const [drafts, setDrafts] = useState<Drafts>(INITIAL_DRAFTS)
  // every "Leer mi resultado" sets a fresh edition (and a fresh useLevels)
  const [edition, setEdition] = useState(0)
  const [methodOpen, setMethodOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [returning, setReturning] = useState(false)
  const frontTitle = useRef<HTMLHeadingElement>(null)

  const read = () => {
    setEdition((n) => n + 1)
    setAnnouncement('Componiendo tu resultado…')
    window.scrollTo({ top: 0 })
    void flow.calculate()
  }

  const restart = () => {
    flow.reset()
    setReturning(true)
    setAnnouncement('')
    window.scrollTo({ top: 0 })
  }

  const view = flow.status === 'idle' ? 'front' : flow.status === 'error' ? 'error' : 'article'

  // the paper goes all the way to the edges: overscroll and the phone's
  // browser bar show newsprint, not the site's blue-white (restored on leave)
  useEffect(() => {
    const body = document.body
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const previous = { background: body.style.backgroundColor, theme: meta?.content }
    body.style.backgroundColor = PAPER
    if (meta) meta.content = PAPER
    return () => {
      body.style.backgroundColor = previous.background
      if (meta && previous.theme !== undefined) meta.content = previous.theme
    }
  }, [])

  // back on the front page after a result: put the reader at the question
  useEffect(() => {
    if (view === 'front' && returning) frontTitle.current?.focus({ preventScroll: true })
  }, [view, returning])

  const household =
    flow.results && flow.equivIncome !== null
      ? {
          adults: flow.answers.adults,
          children: flow.answers.children,
          equivIncome: flow.equivIncome,
        }
      : null

  return (
    <div className={s.root}>
      <div className={s.page}>
        <Masthead
          variant={view === 'front' ? 'full' : 'compact'}
          onRestart={flow.status === 'done' ? restart : undefined}
        />
        {view === 'front' && (
          <Frase flow={flow} drafts={drafts} setDrafts={setDrafts} onRead={read} titleRef={frontTitle} />
        )}
        {view === 'error' && <Erratas message={flow.error} onRetry={read} onBack={restart} />}
        {view === 'article' && (
          <Edicion
            key={edition}
            flow={flow}
            onRestart={restart}
            onRetry={read}
            onMethod={() => setMethodOpen(true)}
            onAnnounce={setAnnouncement}
          />
        )}
      </div>

      <p className={s.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>

      <Metodologia open={methodOpen} onClose={() => setMethodOpen(false)} household={household} />
    </div>
  )
}

interface EdicionProps {
  flow: Flow
  onRestart: () => void
  onRetry: () => void
  onMethod: () => void
  onAnnounce: (text: string) => void
}

// One edition: the press while the numbers are computed and the three
// distributions load, then the article.
function Edicion({ flow, onRestart, onRetry, onMethod, onAnnounce }: EdicionProps) {
  const data = useLevels(flow.results, flow.answers.municipality, flow.answers.perceivedPercentile)

  if (flow.status === 'calculating' || data.loading) return <Imprenta />
  if (data.error || data.levels.length < 3) {
    return (
      <Erratas
        message="No pudimos cargar las distribuciones de tu municipio."
        onRetry={onRetry}
        onBack={onRestart}
      />
    )
  }
  return <Articulo flow={flow} data={data} onRestart={onRestart} onMethod={onMethod} onAnnounce={onAnnounce} />
}
