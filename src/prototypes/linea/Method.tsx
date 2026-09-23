'use client'

import { useEffect, useRef } from 'react'
import { CloseIcon, ExternalIcon } from './Icons'
import { CODE_URL, NOTE_URL } from './network'
import s from './Method.module.css'

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: 'Los datos',
    text: 'El Atlas de Distribución de Renta de los Hogares del INE, hecho con las declaraciones del IRPF: la renta media y la desigualdad (índice de Gini) de más de 35.000 secciones censales, barrios de unos 1.000 a 2.500 vecinos.',
  },
  {
    title: 'Una curva por barrio',
    text: 'En cada sección, los ingresos siguen una curva log-normal que queda fijada por su renta media y su Gini. Donde el INE no da el Gini (un 5 % de las secciones), lo estimamos con aprendizaje automático.',
  },
  {
    title: 'Las 99 paradas',
    text: 'Sumamos las curvas de todos los barrios, cada uno según su población, y obtenemos la distribución de España, de cada provincia y de cada municipio. Sus percentiles del 1 al 99 son las paradas.',
  },
  {
    title: 'Tu billete',
    text: 'Dividimos los ingresos anuales del hogar entre sus unidades de consumo (escala de la OCDE modificada: 1 el primer adulto, 0,5 cada otra persona de 14 años o más y 0,3 cada menor de 14) y buscamos en qué parada cae esa cifra en cada línea.',
  },
  {
    title: 'Al día',
    text: 'El Atlas llega hasta 2023. Llevamos las rentas a 2024 con el crecimiento que mide la Encuesta de Condiciones de Vida, corregido con la relación histórica entre ambas fuentes.',
  },
]

// "Cómo se calcula": a native modal <dialog> (focus trap, Esc to close) laid
// out like a line: each step of the method is a stop.
export default function Method({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close()
      else d.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="linea-method-title"
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.panel}>
        <header className={s.head}>
          <span className={s.sign} aria-hidden="true">
            i
          </span>
          <h2 id="linea-method-title" className={s.title}>
            Cómo se calcula
          </h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>

        <div className={s.body}>
          <ol className={s.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={s.step}>
                <span className={s.stepNum} aria-hidden="true">
                  {i + 1}
                </span>
                <div className={s.stepText}>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className={s.caveat}>
            Son estimaciones: el método suaviza los extremos y probablemente se queda corto con las rentas más altas.
            Este prototipo no guarda tus respuestas.
          </p>

          <div className={s.links}>
            <a className={s.linkPrimary} href={NOTE_URL} target="_blank" rel="noopener noreferrer">
              Nota metodológica (PDF)
              <ExternalIcon />
              <span className={s.srOnly}> (se abre en otra pestaña)</span>
            </a>
            <a className={s.linkSecondary} href={CODE_URL} target="_blank" rel="noopener noreferrer">
              Código en GitHub
              <ExternalIcon />
              <span className={s.srOnly}> (se abre en otra pestaña)</span>
            </a>
          </div>
        </div>
      </div>
    </dialog>
  )
}
