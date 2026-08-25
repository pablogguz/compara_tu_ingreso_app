'use client'

import { useMemo } from 'react'
import Select from 'react-select'
import { compactSelectStyles } from './selectStyles'

interface HouseholdStepProps {
  adults: number
  children: number
  onAdultsChange: (n: number) => void
  onChildrenChange: (n: number) => void
  onNext: () => void
  onPrev: () => void
}

const adultOptions = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  label: (i + 1).toString(),
}))

const childrenOptions = Array.from({ length: 21 }, (_, i) => ({
  value: i,
  label: i.toString(),
}))

export default function HouseholdStep({
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
  onNext,
  onPrev,
}: HouseholdStepProps) {
  const portalTarget = useMemo(
    () => (typeof document !== 'undefined' ? document.body : null),
    []
  )

  return (
    <section className="question-step" aria-labelledby="q-household">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-users"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title" id="q-household">
              ¿Cómo es tu hogar?
            </h2>
            <p className="question-subtitle">
              Cuenta a todas las personas que conviven contigo, incluido tú
            </p>
          </div>
        </header>

        <div className="question-content">
          <div className="household-inputs">
            <div className="input-group">
              <label className="household-label" htmlFor="adults-select">
                Mayores de 14 años
              </label>
              <Select
                inputId="adults-select"
                aria-label="Mayores de 14 años"
                value={{ value: adults, label: adults.toString() }}
                onChange={(opt) => onAdultsChange(opt?.value ?? 1)}
                options={adultOptions}
                isSearchable={false}
                styles={compactSelectStyles}
                menuPortalTarget={portalTarget}
                menuPosition="fixed"
                menuPlacement="auto"
              />
            </div>
            <div className="input-group">
              <label className="household-label" htmlFor="children-select">
                Menores de 14 años
              </label>
              <Select
                inputId="children-select"
                aria-label="Menores de 14 años"
                value={{ value: children, label: children.toString() }}
                onChange={(opt) => onChildrenChange(opt?.value ?? 0)}
                options={childrenOptions}
                isSearchable={false}
                styles={compactSelectStyles}
                menuPortalTarget={portalTarget}
                menuPosition="fixed"
                menuPlacement="auto"
              />
            </div>
          </div>
          <p className="help-text">
            Usamos la escala de la OCDE para comparar hogares de distinto tamaño.
          </p>
        </div>

        <div className="button-wrapper">
          <button type="button" onClick={onPrev} className="btn btn--secondary">
            <i
              className="fas fa-arrow-left btn__icon btn__icon--left"
              aria-hidden="true"
            ></i>
            Anterior
          </button>
          <button type="button" onClick={onNext} className="btn btn--primary">
            Siguiente
            <i
              className="fas fa-arrow-right btn__icon btn__icon--right"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>
    </section>
  )
}
