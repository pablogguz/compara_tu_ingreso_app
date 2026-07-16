'use client'

import { useMemo } from 'react'
import { validateMonthlyIncome } from '@/lib/validation'

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
    <div className="question-step">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-euro-sign"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title">
              ¿Cuáles fueron los ingresos netos{' '}
              <strong className="accent-text">mensuales</strong> de tu hogar en
              2024?
            </h2>
            <p className="question-subtitle">
              Introduce los ingresos netos{' '}
              <strong className="accent-text">mensuales</strong> de tu hogar en
              2024
            </p>
          </div>
        </header>
        <div className="question-content">
          <div className="input-centered">
            <input
              type="number"
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
          </div>
        </div>

        <div className="payment-periods">
          <div className="payment-periods__label">¿Cuántas pagas recibes al año?</div>
          <button
            type="button"
            role="switch"
            aria-checked={paymentPeriods === 14}
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

        {isInvalid && (
          <div className="field-message field-message--error">
            {validation.message}
          </div>
        )}
        {isWarning && (
          <div className="field-message field-message--warning">
            {validation.message}
          </div>
        )}

        <div className="button-wrapper">
          <button onClick={onPrev} className="btn-nav prev-btn">
            <i
              className="fas fa-arrow-left btn-icon-left"
              aria-hidden="true"
            ></i>
            Anterior
          </button>
          <button
            onClick={onNext}
            className="btn-nav next-btn"
            disabled={!canAdvance}
          >
            Siguiente
            <i
              className="fas fa-arrow-right btn-icon-right"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>
    </div>
  )
}
