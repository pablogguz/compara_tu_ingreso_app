'use client'

import { useEffect, useRef } from 'react'
import s from './App.module.css'

interface ErratasProps {
  message: string | null
  onRetry: () => void
  onBack: () => void
}

// The error page, as a correction notice.
export default function Erratas({ message, onRetry, onBack }: ErratasProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main className={s.errata} role="alert">
      <p className={s.kicker}>Fe de erratas</p>
      <h1 ref={titleRef} tabIndex={-1} className={s.errataTitle}>
        No hemos podido componer tu resultado
      </h1>
      <p className={s.errataText}>
        {message ?? 'Algo falló al cargar los datos.'} Tus respuestas siguen donde las dejaste.
      </p>
      <div className={s.errataActions}>
        <button type="button" className={s.primary} onClick={onRetry}>
          Intentarlo de nuevo
        </button>
        <button type="button" className={s.secondary} onClick={onBack}>
          Volver a la frase
        </button>
      </div>
    </main>
  )
}
