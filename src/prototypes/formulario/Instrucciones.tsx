'use client'

import { useEffect, useId, useRef } from 'react'
import { euro } from '../shared/format'
import { CODE_URL, NOTE_URL, unitsSum, YEAR } from './copy'
import { Chip, cx } from './ui'
import a from './App.module.css'
import s from './Instrucciones.module.css'

interface InstruccionesProps {
  open: boolean
  onClose: () => void
  /** the user's household, once there is a result to explain */
  household?: { adults: number; children: number; equivIncome: number } | null
}

// "Instrucciones para cumplimentar": the method, in the form's voice, as the
// back of the form laid over the page.
export default function Instrucciones({ open, onClose, household }: InstruccionesProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  const yours = household
    ? ` En su caso: ${unitsSum(household.adults, household.children)} unidades de consumo, ${euro(household.equivIncome)} al año por unidad.`
    : ''

  return (
    <dialog
      ref={ref}
      className={cx(s.dialog, a.noPrint)}
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop lands on the dialog itself
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.sheet}>
        <div className={s.bar}>
          <span>
            <span className={s.barLong}>Modelo CTI · </span>Hoja de instrucciones
          </span>
          <button type="button" className={s.close} onClick={onClose}>
            Cerrar <span aria-hidden="true">✕</span>
          </button>
        </div>
        <h2 id={`${uid}-title`} className={s.title} tabIndex={-1}>
          Instrucciones para cumplimentar e interpretar el modelo
        </h2>
        <p className={s.lead}>
          Lea detenidamente estas instrucciones. O no: el formulario funciona igual.
        </p>

        <ol className={s.rules}>
          <li>
            <Chip className={s.num}>1ª</Chip>
            <p>
              <strong>Origen de los datos.</strong> Las cifras de comparación proceden del Atlas de Distribución de
              Renta de los Hogares del INE, elaborado a partir de las declaraciones del IRPF, para las 37.072 secciones
              censales de España. Los últimos datos publicados son de 2023 y se proyectan a {YEAR} con un crecimiento
              del 5,1 %, tomado de la Encuesta de Condiciones de Vida.
            </p>
          </li>
          <li>
            <Chip className={s.num}>2ª</Chip>
            <p>
              <strong>Dentro de cada sección.</strong> De cada sección censal se conocen la renta media y su
              desigualdad (el índice de Gini). Con ambas se traza una distribución log-normal. Donde el INE no publica
              el Gini, en el 5,5 % de las secciones, se estima con un modelo de aprendizaje automático a partir de su
              demografía.
            </p>
          </li>
          <li>
            <Chip className={s.num}>3ª</Chip>
            <p>
              <strong>De la sección al país (casillas 10, 11 y 12).</strong> Las distribuciones de todas las secciones
              se suman, cada una con el peso de su población, para obtener la de España, la de cada provincia y la de
              cada municipio. Por eso el percentil se refiere a personas: el percentil 86 significa que 86 de cada 100
              personas viven en hogares con menos renta por unidad de consumo que el suyo.
            </p>
          </li>
          <li>
            <Chip className={s.num}>4ª</Chip>
            <p>
              <strong>Unidades de consumo (casillas 07, 08 y 09).</strong> Los ingresos anuales del hogar se dividen
              entre sus unidades de consumo, según la escala de la OCDE modificada: 1 por la primera persona adulta, 0,5
              por cada otra persona de 14 años o más y 0,3 por cada menor de 14. Si cobra en 14 pagas, se cuentan las
              14.{yours}
            </p>
          </li>
          <li>
            <Chip className={s.num}>5ª</Chip>
            <p>
              <strong>Tratamiento de los datos.</strong> Las operaciones se realizan en su navegador. Este formulario no
              conserva ni transmite sus respuestas y carece de validez fiscal.
            </p>
          </li>
        </ol>

        <p className={s.links}>
          <a href={NOTE_URL} target="_blank" rel="noopener noreferrer">
            Nota metodológica completa (PDF, en inglés)
          </a>
          <a href={CODE_URL} target="_blank" rel="noopener noreferrer">
            Código y datos, en GitHub
          </a>
        </p>
      </div>
    </dialog>
  )
}
