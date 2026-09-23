'use client'

import { useId, type Ref } from 'react'
import { ArrowIcon, Barcode, Chip, Page, SheetHeader, cx } from './ui'
import { CODE_URL, YEAR } from './copy'
import a from './App.module.css'
import s from './Cover.module.css'

// the approved mockup's barcode, bar for bar
const COVER_BARCODE = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 3, 1, 2, 2, 1, 4, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 4, 1, 1, 3, 2, 1, 2, 1, 3, 1, 4, 2, 1, 3, 1, 2, 1, 1, 3]

const ROWS = [
  { box: '01', label: 'Municipio de residencia', section: 'Apartado A' },
  { box: '02 · 03', label: 'Ingresos netos mensuales del hogar y número de pagas', section: 'Apartado B' },
  { box: '04 · 05', label: 'Personas que viven en el hogar, de 14 años o más y menores', section: 'Apartado C' },
  { box: '06', label: 'Posición en la que cree que se sitúa su hogar', section: 'Apartado D' },
]

const FACTS: Array<[string, string]> = [
  ['Casillas', '6'],
  ['Tiempo estimado', '1 min'],
  ['Coste', '0,00 €'],
  ['Registro', 'No necesario'],
]

interface CoverProps {
  onStart: () => void
  onInstructions: () => void
  titleRef: Ref<HTMLHeadingElement>
  /** the user has already filled in part of the form */
  resumed: boolean
}

// Page 1: the cover of the form, with its instructions.
export default function Cover({ onStart, onInstructions, titleRef, resumed }: CoverProps) {
  const uid = useId()
  return (
    <Page
      strip={`Ejemplar para el interesado · Compara tu ingreso · Ejercicio ${YEAR}`}
      stripShort={`Ejemplar para el interesado · Ejercicio ${YEAR}`}
    >
      <div className={cx(a.sheet, a.fill)}>
        <SheetHeader
          variant="cover"
          titleRef={titleRef}
          title="Declaración de la posición de renta del hogar"
          sub={`Ejercicio ${YEAR} · Hogares residentes en España`}
          aside={
            <span aria-hidden="true">
              Espacio reservado
              <br />
              para el sello
            </span>
          }
        />

        <div className={s.body}>
          <section className={s.main} aria-labelledby={`${uid}-before`}>
            <h2 id={`${uid}-before`} className={s.h2}>
              Antes de empezar
            </h2>
            <p className={s.intro}>
              Este formulario sitúa los ingresos de su hogar en la distribución de la renta de toda la población de
              España, de su provincia y de su municipio. Solo tiene que cumplimentar seis casillas.
            </p>
            <ol className={s.rows} aria-label="Casillas del formulario">
              {ROWS.map((r) => (
                <li key={r.box} className={s.row}>
                  <Chip className={s.rowChip}>{r.box}</Chip>
                  <span className={s.rowLabel}>{r.label}</span>
                  <span className={s.rowSection}>{r.section}</span>
                </li>
              ))}
            </ol>
          </section>
          <p className={s.source}>
            Los datos de comparación proceden de las declaraciones del IRPF, que el INE publica en su Atlas de
            Distribución de Renta de los Hogares. Este formulario no tiene validez fiscal: nada de lo que escriba se
            envía a Hacienda, ni a ningún otro sitio.
          </p>

          <aside className={s.panel} aria-labelledby={`${uid}-panel`}>
            <h2 id={`${uid}-panel`} className={s.panelTitle}>
              Presentación
            </h2>
            <dl className={s.facts}>
              {FACTS.map(([k, v]) => (
                <div key={k} className={s.fact}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className={cx(a.btn, a.btnPrimary, s.start)} onClick={onStart}>
              {resumed ? 'Continuar' : 'Cumplimentar'}
              <ArrowIcon />
            </button>
            <button type="button" className={a.linkButton} onClick={onInstructions}>
              Leer las instrucciones
            </button>
            <div className={s.code}>
              <Barcode widths={COVER_BARCODE} height={54} unit={2} />
              <span className={s.codeText}>CTI {YEAR} 000 000 001</span>
            </div>
          </aside>
        </div>

        <footer className={a.foot}>
          <span>
            comparatuingreso.es ·{' '}
            <a href={CODE_URL} target="_blank" rel="noopener noreferrer">
              Código abierto
            </a>
          </span>
          <span>Pág. 1 de 2</span>
        </footer>
      </div>
    </Page>
  )
}
