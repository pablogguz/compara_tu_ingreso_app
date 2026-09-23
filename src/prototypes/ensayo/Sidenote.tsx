'use client'

import { useId, useState } from 'react'
import { cx } from './copy'
import a from './App.module.css'

interface SidenoteProps {
  n: number
  /** a short question the note answers: "¿Qué es una unidad de consumo?" */
  title?: string
  children: React.ReactNode
}

// A Tufte-style sidenote. From 1180px it sits in the right margin next to the
// line it annotates; below that the number is a button that opens the note
// inline. Everything here is phrasing content, so it can live inside a <p>.
export default function Sidenote({ n, title, children }: SidenoteProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <>
      <sup className={a.noteRef}>
        <button
          type="button"
          className={a.noteBtn}
          aria-expanded={open}
          aria-controls={id}
          aria-label={`Nota ${n}${title ? `: ${title}` : ''}`}
          onClick={() => setOpen((o) => !o)}
        >
          {n}
        </button>
        <span className={a.noteNum} aria-hidden="true">
          {n}
        </span>
      </sup>
      <span id={id} className={cx(a.note, open && a.noteOpen)} role="note">
        <span className={a.noteLead} aria-hidden="true">
          {n}
        </span>
        {title && <span className={a.noteTitle}>{title} </span>}
        {children}
      </span>
    </>
  )
}
