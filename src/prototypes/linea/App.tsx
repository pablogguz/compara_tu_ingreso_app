'use client'

// D · Línea — incomes as a transit line. Everyone in Spain, ordered by the
// income of their household, is a line of 99 stops (percentiles). You buy a
// ticket (the four answers) and learn at which stop you get off, on three
// parallel lines: España (L1), your province (L2) and your municipality (L3).

import { useEffect, useRef, useState } from 'react'
import { DataProvider } from '@/lib/DataContext'
import {
  loadMunicipalDensity,
  loadMunicipalityStats,
  loadNationalDensity,
  loadProvincialDensity,
} from '@/lib/dataLoader'
import { useFlow } from '../shared/useFlow'
import Machine from './Machine'
import Printing from './Printing'
import Results from './Results'
import Method from './Method'
import { useReducedMotion } from './hooks'
import s from './App.module.css'

type Phase = 'machine' | 'printing' | 'results'

export default function LineaApp() {
  return (
    <DataProvider>
      <Linea />
    </DataProvider>
  )
}

function Linea() {
  const reduced = useReducedMotion()
  // long enough for the ticket to finish feeding out of the slot
  const flow = useFlow({ minLoadingMs: reduced ? 600 : 1650 })
  const [phase, setPhase] = useState<Phase>('machine')
  const [trip, setTrip] = useState(0)
  const [methodOpen, setMethodOpen] = useState(false)
  const returning = useRef(false)

  const start = async () => {
    const m = flow.municipality
    if (!flow.canCalculate || !m) return
    setPhase('printing')
    // the results screen also reads the density files and the municipality's
    // figures: fetch them while the ticket prints, so the lines appear at once
    const extras = Promise.all([
      loadNationalDensity(),
      loadProvincialDensity(m.prov_code),
      loadMunicipalDensity(m.mun_code, m.prov_code),
      loadMunicipalityStats(m.mun_code),
    ]).catch(() => null)
    const [r] = await Promise.all([flow.calculate(), extras])
    if (r) {
      setTrip((t) => t + 1)
      setPhase('results')
    } else {
      setPhase('machine')
    }
  }

  const newTrip = () => {
    returning.current = true
    flow.reset()
    setPhase('machine')
  }

  const firstPhase = useRef(true)
  useEffect(() => {
    if (firstPhase.current) {
      firstPhase.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [phase])

  return (
    <div className={s.root}>
      {phase === 'machine' && (
        <div className={s.phase} key="machine">
          <Machine
            flow={flow}
            onSubmit={start}
            onMethod={() => setMethodOpen(true)}
            focusHeading={returning.current}
          />
        </div>
      )}
      {phase === 'printing' && (
        <div className={s.phase} key="printing">
          <Printing flow={flow} />
        </div>
      )}
      {phase === 'results' && (
        <div className={s.phase} key={`results-${trip}`}>
          <Results flow={flow} onNewTrip={newTrip} onMethod={() => setMethodOpen(true)} />
        </div>
      )}
      <Method open={methodOpen} onClose={() => setMethodOpen(false)} />
    </div>
  )
}
