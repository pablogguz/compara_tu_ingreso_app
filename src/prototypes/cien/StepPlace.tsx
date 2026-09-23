'use client'

import { useState } from 'react'
import MunicipalitySearch from '@/prototypes/shared/MunicipalitySearch'
import { naturalName } from '@/prototypes/shared/format'
import type { Flow } from '@/prototypes/shared/useFlow'
import { cx } from './ui'
import q from './Question.module.css'

const INPUT_ID = 'cien-municipio'
const LABEL_ID = 'cien-municipio-label'

export default function StepPlace({ flow, attempted }: { flow: Flow; attempted: boolean }) {
  // When the box is focused with a municipality already chosen, the search
  // runs on "Madrid (Madrid)" and finds nothing; keep that empty list closed
  // until the user actually types.
  const [pristine, setPristine] = useState(false)
  const m = flow.municipality
  const mun = m ? naturalName(m.mun_name) : ''
  const prov = m ? naturalName(m.prov_name) : ''

  return (
    <>
      <h1 className={q.title}>
        <label id={LABEL_ID} htmlFor={INPUT_ID}>
          ¿Dónde vives?
        </label>
      </h1>
      <p className={q.hint}>Escribe tu municipio y elígelo en la lista.</p>
      <div className={q.combo} onFocusCapture={() => setPristine(true)} onChangeCapture={() => setPristine(false)}>
        <MunicipalitySearch
          label="¿Dónde vives?"
          labelledBy={LABEL_ID}
          inputId={INPUT_ID}
          value={flow.answers.municipality}
          onChange={(code) => flow.set('municipality', code)}
          placeholder="Tu municipio"
          maxResults={6}
          classes={{
            input: q.comboInput,
            list: cx(q.comboList, pristine && !!flow.answers.municipality && q.comboListHidden),
            option: q.comboOption,
            optionActive: q.comboOptionActive,
            name: q.comboName,
            meta: q.comboMeta,
            status: q.comboStatus,
          }}
        />
      </div>
      {m ? (
        <p className={q.chosen}>
          Te compararemos con <strong>España</strong>, con la <strong>provincia de {prov}</strong> y con{' '}
          <strong>{mun}</strong>.
        </p>
      ) : attempted ? (
        <p className={cx(q.msg, q.msgError)} role="alert">
          Elige tu municipio en la lista para seguir.
        </p>
      ) : (
        <p className={q.chosen} aria-hidden="true">
          &nbsp;
        </p>
      )}
    </>
  )
}
