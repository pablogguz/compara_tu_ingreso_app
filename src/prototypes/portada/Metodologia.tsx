'use client'

import { useEffect, useId, useRef } from 'react'
import { euro, scaleExplained } from '../shared/format'
import { CODE_URL, NOTE_URL } from './copy'
import s from './Metodologia.module.css'

interface MetodologiaProps {
  open: boolean
  onClose: () => void
  /** the reader's household, when there is a result to explain */
  household?: { adults: number; children: number; equivIncome: number | null } | null
}

// "Cómo lo calculamos": the method, in the paper's voice, as a modal sheet.
export default function Metodologia({ open, onClose, household }: MetodologiaProps) {
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

  const yours =
    household && household.equivIncome !== null
      ? ` En tu caso, ${scaleExplained(household.adults, household.children)}: ${euro(household.equivIncome)} al año por unidad de consumo.`
      : ''

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop lands on the dialog itself
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.sheet}>
        <div className={s.top}>
          <p className={s.kicker}>Metodología</p>
          <button type="button" className={s.close} onClick={onClose}>
            Cerrar <span aria-hidden="true">✕</span>
          </button>
        </div>
        <h2 id={`${uid}-title`} className={s.title}>
          Cómo lo calculamos
        </h2>
        <p className={s.dek}>
          Datos públicos, un modelo sencillo y ninguna respuesta guardada. Así situamos tu hogar en el reparto de la
          renta.
        </p>

        <div className={s.columns}>
          <p>
            <strong>La fuente.</strong> El INE publica en su Atlas de Distribución de Renta de los Hogares la renta
            neta de las 37.072 secciones censales de España, barrios de unos 1.300 vecinos, a partir de las
            declaraciones del IRPF. Los últimos datos son de 2023; los llevamos a 2024 con el crecimiento que recoge la
            Encuesta de Condiciones de Vida (un 5,1 %).
          </p>
          <p>
            <strong>Dentro de cada barrio.</strong> De cada sección conocemos la renta media y su desigualdad, el índice
            de Gini. Con esos dos datos dibujamos una curva log-normal, la forma que suelen tener los ingresos. Donde
            falta el Gini, en torno al 5,5 % de las secciones, lo estimamos con un modelo de aprendizaje automático a
            partir de su demografía.
          </p>
          <p>
            <strong>Del barrio al país.</strong> Sumamos las curvas de todas las secciones, cada una con el peso de su
            población, y obtenemos el reparto de España, de cada provincia y de cada municipio. Por eso los percentiles
            hablan de personas: estar en el 86 quiere decir que 86 de cada 100 personas viven en hogares con menos
            ingresos que el tuyo.
          </p>
          <p>
            <strong>Tu hogar.</strong> No es lo mismo un sueldo para una persona que para cuatro. Dividimos los ingresos
            del hogar entre sus unidades de consumo, según la escala de la OCDE modificada: 1 por el primer adulto, 0,5
            por cada otra persona de 14 años o más y 0,3 por cada menor de 14. Si cobras en 14 pagas, contamos las 14.
            {yours}
          </p>
          <p>
            <strong>Lo que no hacemos.</strong> Las cuentas se hacen en tu navegador. Este prototipo no guarda tus
            respuestas.
          </p>
        </div>

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
