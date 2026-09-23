'use client'

import { useEffect, useState } from 'react'
import { euro, scaleExplained } from '@/prototypes/shared/format'
import { CODE_URL, NOTE_URL, cx } from './copy'
import a from './App.module.css'
import s from './Method.module.css'

const CITATION = 'García Guzmán, P. (2026). Compara tu ingreso. comparatuingreso.es'

interface MethodProps {
  /** section number: 2 before the result, 4 after it */
  number: number
  /** the reader's household, once there is one to explain */
  household: { adults: number; children: number; equivIncome: number | null } | null
}

// The apparatus at the end of the essay: how it is calculated, the
// references and how to cite it. Always there, so it can be read first.
export default function Method({ number, household }: MethodProps) {
  const [copied, setCopied] = useState('')
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(''), 2600)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CITATION)
      setCopied('Cita copiada')
    } catch {
      setCopied('No se pudo copiar')
    }
  }

  const yours =
    household && household.equivIncome !== null
      ? ` En tu caso, ${scaleExplained(household.adults, household.children)}: ${euro(household.equivIncome)} al año por unidad de consumo.`
      : ''

  return (
    <>
      <section id="metodo" className={cx(a.flow, a.section, a.prose, s.method)} aria-labelledby="ensayo-metodo">
        <div className={a.sectionHead}>
          <span className={a.secNum}>{number}</span>
          <h2 className={a.h2} id="ensayo-metodo">
            Cómo se calcula
          </h2>
        </div>

        <p>
          <span className={s.run}>Los datos.</span> Todo parte del Atlas de Distribución de Renta de los Hogares del
          INE, que estima, a partir de las declaraciones del IRPF y de otros registros administrativos, la renta neta
          de cada una de las 37.072 secciones censales de España y cuánta desigualdad hay dentro de cada una: su índice
          de Gini.
        </p>
        <p>
          <span className={s.run}>Dentro de cada barrio.</span> Suponemos que en cada sección la renta sigue una
          distribución log-normal, la forma de campana asimétrica, con una cola larga hacia la derecha, que suelen tener
          los ingresos. Su centro sale de la renta media de la sección y su anchura, del Gini. El INE no publica el Gini
          del 5,5 % de las secciones; ahí lo estimamos con un modelo de aprendizaje automático a partir de su
          demografía.
        </p>
        <p>
          <span className={s.run}>Del barrio al país.</span> Sumamos las curvas de todas las secciones, cada una con el
          peso de su población, y obtenemos la distribución de España, la de cada provincia y la de cada municipio. De
          cada una calculamos los percentiles del 1 al 99. Como cada sección pesa por sus habitantes, los percentiles
          hablan de personas: estar en el 86 quiere decir que 86 de cada 100 personas viven en hogares con menos
          ingresos que el tuyo.
        </p>
        <p>
          <span className={s.run}>De 2023 a 2024.</span> Los datos del Atlas son de 2023. Para llevarlos a 2024
          aplicamos a todas las rentas un mismo crecimiento nacional del 5,1 %: el que recoge la Encuesta de Condiciones
          de Vida, corregido por la diferencia histórica entre las dos fuentes.
        </p>
        <p>
          <span className={s.run}>Tu hogar.</span> Sumamos lo que entra en casa en un año (12 o 14 pagas) y lo
          dividimos entre las unidades de consumo del hogar, según la escala de la OCDE modificada: 1 por la primera
          persona, 0,5 por cada otra de 14 años o más y 0,3 por cada menor de 14.{yours}
        </p>
        <p>
          <span className={s.run}>Los límites.</span> Es una estimación. La forma log-normal suaviza los extremos y las
          rentas más altas son las peor medidas, así que los percentiles de los extremos son los menos precisos. Las
          cuentas se hacen en tu navegador: este prototipo no guarda tus respuestas.
        </p>
      </section>

      <section className={cx(a.flow, s.refs)} aria-labelledby="ensayo-referencias">
        <h2 className={s.h3} id="ensayo-referencias">
          Referencias
        </h2>
        <ol className={s.refList}>
          <li>
            Instituto Nacional de Estadística. <cite>Atlas de Distribución de Renta de los Hogares</cite>, datos de 2023.{' '}
            <a href="https://www.ine.es" target="_blank" rel="noopener noreferrer">
              ine.es
            </a>
          </li>
          <li>
            Instituto Nacional de Estadística. <cite>Encuesta de Condiciones de Vida</cite>.
          </li>
          <li>
            Instituto Nacional de Estadística. <cite>Censo de Población</cite>: población por nivel de estudios y por
            lugar de nacimiento, por sección censal.
          </li>
          <li>
            García Guzmán, P. <cite>Compara tu ingreso: nota metodológica</cite>.{' '}
            <a href={NOTE_URL} target="_blank" rel="noopener noreferrer">
              PDF, en inglés
            </a>
            .
          </li>
          <li>
            García Guzmán, P. <cite>Código y datos de Compara tu ingreso</cite>.{' '}
            <a href={CODE_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </li>
          <li>
            Cruces, G., Perez-Truglia, R. y Tetaz, M. (2013). Biased perceptions of income distribution and preferences
            for redistribution: Evidence from a survey experiment. <cite>Journal of Public Economics</cite>, 98,
            100–112.
          </li>
        </ol>

        <h2 className={cx(s.h3, s.citeHead)} id="ensayo-citar">
          Cómo citar
        </h2>
        <div className={s.cite}>
          <p className={s.citeText}>{CITATION}</p>
          <button type="button" className={cx(a.btn, a.btnSecondary, s.citeBtn)} onClick={copy}>
            Copiar
          </button>
          <span className={s.copied} role="status" aria-live="polite">
            {copied}
          </span>
        </div>
      </section>
    </>
  )
}
