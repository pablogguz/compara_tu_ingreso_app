'use client'

import { useMemo } from 'react'
import { validateMonthlyIncome } from '@/lib/validation'
import { formatCurrency } from '@/lib/calculations'

interface IncomeStepProps {
  value: number | ''
  paymentPeriods: 12 | 14
  onValueChange: (v: number | '') => void
  onPaymentPeriodsChange: (p: 12 | 14) => void
  onNext: () => void
  onPrev: () => void
}

export default function IncomeStep({
  value,
  paymentPeriods,
  onValueChange,
  onPaymentPeriodsChange,
  onNext,
  onPrev,
}: IncomeStepProps) {
  const validation = useMemo(() => validateMonthlyIncome(value), [value])
  const isInvalid = validation.state === 'invalid'
  const isWarning = validation.state === 'warning'
  const canAdvance = validation.state === 'valid' || validation.state === 'warning'

  return (
    <section className="question-step" aria-labelledby="q-income">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-euro-sign"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title" id="q-income">
              ¿Cuáles fueron los ingresos netos{' '}
              <em className="accent-text">mensuales</em> de tu hogar en 2024?
            </h2>
            <p className="question-subtitle">
              Suma los ingresos netos de todas las personas del hogar en un mes
              típico
            </p>
          </div>
        </header>

        <div className="question-content">
          <div className="input-adorned">
            <span className="input-adorned__prefix" aria-hidden="true">
              €
            </span>
            <input
              id="income-input"
              type="number"
              inputMode="decimal"
              aria-label="Ingresos netos mensuales del hogar en euros"
              aria-invalid={isInvalid || undefined}
              aria-describedby={
                isInvalid || isWarning ? 'income-message' : undefined
              }
              value={value}
              onChange={(e) => {
                const raw = e.target.value
                onValueChange(raw === '' ? '' : Number(raw))
              }}
              className={`form-control form-control--lg ${isInvalid ? 'invalid' : ''}`}
              min={0}
              max={50000}
              placeholder="Ejemplo: 2500"
            />
            <span className="input-adorned__suffix" aria-hidden="true">
              / mes
            </span>
          </div>

          {canAdvance && typeof value === 'number' && (
            <p className="help-text">
              Al año: <strong>{formatCurrency(value * paymentPeriods)}</strong>{' '}
              en {paymentPeriods} pagas
            </p>
          )}

          {(isInvalid || isWarning) && (
            <div
              id="income-message"
              role={isInvalid ? 'alert' : 'status'}
              className={`field-message ${isInvalid ? 'field-message--error' : 'field-message--warning'}`}
            >
              {validation.message}
            </div>
          )}

          <div className="payment-periods">
            <div className="payment-periods__label" id="pagas-label">
              ¿Cuántas pagas recibes al año?
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={paymentPeriods === 14}
              aria-labelledby="pagas-label"
              onClick={() =>
                onPaymentPeriodsChange(paymentPeriods === 12 ? 14 : 12)
              }
              className={`pagas-toggle pagas-toggle--${paymentPeriods}`}
            >
              <span className="pagas-toggle__thumb" aria-hidden="true" />
              <span
                className={`pagas-toggle__option ${paymentPeriods === 12 ? 'is-active' : ''}`}
              >
                12 pagas
              </span>
              <span
                className={`pagas-toggle__option ${paymentPeriods === 14 ? 'is-active' : ''}`}
              >
                14 pagas
              </span>
            </button>
          </div>
        </div>

        <div className="button-wrapper">
          <button type="button" onClick={onPrev} className="btn btn--secondary">
            <i
              className="fas fa-arrow-left btn__icon btn__icon--left"
              aria-hidden="true"
            ></i>
            Anterior
          </button>
          <button
            type="button"
            onClick={onNext}
            className="btn btn--primary"
            disabled={!canAdvance}
          >
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
