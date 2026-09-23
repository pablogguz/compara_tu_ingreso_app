'use client'

import { useEffect, useRef, useState } from 'react'
import { DataProvider } from '@/lib/DataContext'
import { useFlow, type Flow } from '../shared/useFlow'
import { useLevels } from '../shared/useLevels'
import Cover from './Cover'
import Form from './Form'
import Processing from './Processing'
import Justificante from './Justificante'
import Instrucciones from './Instrucciones'
import { StampInk } from './Stamp'
import { FIELD_ID, INITIAL_DRAFT, problems, summary, type Draft } from './checks'
import { YEAR } from './copy'
import { Page, SheetHeader, cx } from './ui'
import s from './App.module.css'

const PAPER = '#e3ebe1'

// B · Formulario — the app as a Spanish administrative form: "Modelo CTI ·
// Declaración de la posición de renta del hogar". Page 1 (cover) → page 2 (the
// form) → the registry (processing) → the stamped justificante.
export default function FormularioApp() {
  return (
    <DataProvider>
      <Formulario />
    </DataProvider>
  )
}

type Stage = 'cover' | 'form' | 'tramite'

function Formulario() {
  const flow = useFlow({ minLoadingMs: 1500 })
  const [stage, setStage] = useState<Stage>('cover')
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT)
  // every "Presentar" gets a fresh registry entry (and a fresh useLevels)
  const [entry, setEntry] = useState(0)
  // a justificante has been issued: the next declaration is a "complementaria"
  const [filed, setFiled] = useState(false)
  const [instructions, setInstructions] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const titleRef = useRef<HTMLHeadingElement>(null)
  // don't steal focus on the first load, only after the user moves
  const moved = useRef(false)

  // the paper goes all the way to the edges: overscroll and the phone's browser
  // bar show the form's green, not the site's blue-white (restored on leave)
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

  // every new page starts at the top, with focus on its title
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    if (moved.current && stage !== 'tramite') titleRef.current?.focus({ preventScroll: true })
  }, [stage])

  const go = (next: Stage) => {
    moved.current = true
    setStage(next)
  }

  const present = () => {
    const list = problems(flow, draft)
    if (list.length > 0) {
      // nothing is sent: the user is taken to the first box that needs them
      setDraft((d) => ({ ...d, attempted: true }))
      setAnnouncement(`No se puede presentar todavía. ${summary(list)}`)
      const target = FIELD_ID[list[0].box]
      requestAnimationFrame(() => document.getElementById(target)?.focus())
      return
    }
    setAnnouncement('Tramitando su declaración…')
    setEntry((n) => n + 1)
    go('tramite')
    void flow.calculate()
  }

  const again = () => {
    flow.reset()
    setFiled(true)
    setAnnouncement('')
    go('form')
  }

  const retry = () => {
    setEntry((n) => n + 1)
    setAnnouncement('Tramitando su declaración…')
    void flow.calculate()
  }

  const review = () => {
    flow.reset()
    setAnnouncement('')
    go('form')
  }

  const resumed = !!flow.answers.municipality || flow.answers.monthlyIncome !== '' || draft.guess !== ''
  const household =
    flow.results && stage === 'tramite'
      ? { adults: flow.answers.adults, children: flow.answers.children, equivIncome: flow.results.equiv_income }
      : null

  return (
    <div className={s.root}>
      <StampInk />
      {stage === 'cover' && (
        <Cover
          titleRef={titleRef}
          resumed={resumed}
          onStart={() => go('form')}
          onInstructions={() => setInstructions(true)}
        />
      )}
      {stage === 'form' && (
        <Form
          flow={flow}
          draft={draft}
          setDraft={setDraft}
          titleRef={titleRef}
          complementary={filed}
          onBack={() => go('cover')}
          onSubmit={present}
        />
      )}
      {stage === 'tramite' && (
        <Tramite
          key={entry}
          flow={flow}
          onAgain={again}
          onRetry={retry}
          onReview={review}
          onInstructions={() => setInstructions(true)}
          onAnnounce={setAnnouncement}
        />
      )}

      <p className={s.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>

      <Instrucciones open={instructions} onClose={() => setInstructions(false)} household={household} />
    </div>
  )
}

interface TramiteProps {
  flow: Flow
  onAgain: () => void
  onRetry: () => void
  onReview: () => void
  onInstructions: () => void
  onAnnounce: (text: string) => void
}

// One registry entry: the processing sheet while the numbers are computed and
// the three distributions load, then the justificante (or a notice).
function Tramite({ flow, onAgain, onRetry, onReview, onInstructions, onAnnounce }: TramiteProps) {
  const data = useLevels(flow.results, flow.answers.municipality, flow.answers.perceivedPercentile)

  if (flow.status === 'error' || data.error) return <Notice onRetry={onRetry} onReview={onReview} />
  if (flow.status !== 'done' || !flow.results || data.loading || data.levels.length < 3) {
    return <Processing flow={flow} />
  }
  return (
    <Justificante flow={flow} data={data} onAgain={onAgain} onInstructions={onInstructions} onAnnounce={onAnnounce} />
  )
}

// The calculation failed: an administrative notice, with a way forward.
function Notice({ onRetry, onReview }: { onRetry: () => void; onReview: () => void }) {
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => title.current?.focus({ preventScroll: true }), [])
  return (
    <Page
      strip={`Ejemplar para el interesado · Notificación · Ejercicio ${YEAR}`}
      stripShort={`Notificación · Ejercicio ${YEAR}`}
    >
      <div className={cx(s.sheet, s.fill)}>
        <SheetHeader
          variant="wide"
          titleRef={title}
          title="No se ha podido tramitar su declaración"
          sub="Notificación del registro de entrada"
          aside={
            <>
              <span className={s.asideLabel}>Estado</span>
              <span className={s.asideValue}>Pendiente</span>
            </>
          }
        />
        <div className={s.notice} role="alert">
          <span className={s.noticeLegend}>Incidencia en la tramitación</span>
          <p className={s.noticeText}>
            No se han podido consultar los datos del INE para calcular su posición. Sus respuestas se conservan: puede
            intentarlo de nuevo ahora o revisar la declaración.
          </p>
          <p className={s.noticeFine}>Suele deberse a un corte de la conexión. No se ha enviado nada a ningún sitio.</p>
          <div className={s.noticeActions}>
            <button type="button" className={cx(s.btn, s.btnPrimary)} onClick={onRetry}>
              Reintentar
            </button>
            <button type="button" className={s.btn} onClick={onReview}>
              Revisar la declaración
            </button>
          </div>
        </div>
      </div>
    </Page>
  )
}
