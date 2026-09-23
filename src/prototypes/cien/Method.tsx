'use client'

import { useEffect, useRef } from 'react'
import { Arrow, CODE_URL, NOTE_URL } from './ui'
import s from './Method.module.css'

const SECTIONS = [
  {
    title: 'Tu ingreso, por unidad de consumo',
    text: 'Multiplicamos lo que entra en casa al mes por 12, o por 14 si cobras 14 pagas, y lo dividimos entre las unidades de consumo del hogar (escala de la OCDE modificada): 1 por la primera persona, 0,5 por cada otra de 14 años o más y 0,3 por cada menor de 14. Así se comparan hogares de distinto tamaño.',
  },
  {
    title: 'Los datos',
    text: 'El Atlas de Distribución de Renta de los Hogares del INE da la renta media y la desigualdad (el índice de Gini) de cada sección censal de España (hay más de 36.000), a partir de las declaraciones de IRPF y otros registros administrativos. Son rentas de 2023, proyectadas a 2024 con la Encuesta de Condiciones de Vida.',
  },
  {
    title: 'Las cien personas',
    text: 'En cada sección suponemos una distribución log-normal con su renta media y su Gini, y las sumamos ponderando por población: salen la distribución de España, la de cada provincia y la de cada municipio. Donde el INE no da el Gini (un 5 % de las secciones), lo estimamos con un modelo de aprendizaje automático.',
  },
  {
    title: 'Tu número',
    text: 'Es tu percentil: de cada 100 personas, cuántas viven en hogares con menos ingresos por unidad de consumo que el tuyo. Va del 1 al 99. Es una estimación: el método suaviza los extremos y seguramente se queda corto con las rentas más altas.',
  },
]

// "Cómo se calcula": a modal <dialog> (focus trap and Escape for free).
export default function Method({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d || typeof d.showModal !== 'function') return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="cien-metodo"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.sheet}>
        <div className={s.head}>
          <span className={s.eyebrow}>Metodología</span>
          <button type="button" className={s.close} onClick={onClose}>
            Cerrar
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2.6" />
            </svg>
          </button>
        </div>
        <h2 id="cien-metodo" className={s.title}>
          Cómo se calcula
        </h2>
        <ol className={s.list}>
          {SECTIONS.map((sec, i) => (
            <li key={sec.title} className={s.item}>
              <span className={s.num} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={s.itemTitle}>{sec.title}</h3>
              <p className={s.itemText}>{sec.text}</p>
            </li>
          ))}
        </ol>
        <div className={s.links}>
          <a className={s.link} href={NOTE_URL} target="_blank" rel="noopener noreferrer">
            Nota metodológica (PDF)
            <Arrow className={s.linkIcon} />
          </a>
          <a className={s.link} href={CODE_URL} target="_blank" rel="noopener noreferrer">
            Código en GitHub
            <Arrow className={s.linkIcon} />
          </a>
        </div>
      </div>
    </dialog>
  )
}
