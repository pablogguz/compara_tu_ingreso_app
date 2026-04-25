'use client'

interface PerceivedStepProps {
  value: number
  isCalculating: boolean
  onChange: (n: number) => void
  onCalculate: () => void
  onPrev: () => void
}

export default function PerceivedStep({
  value,
  isCalculating,
  onChange,
  onCalculate,
  onPrev,
}: PerceivedStepProps) {
  const percent = ((value - 1) / 98) * 100
  const wrapStyle = {
    '--value': `${percent}%`,
  } as React.CSSProperties

  return (
    <div className="question-step">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-bullseye"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title">¿Dónde crees que te sitúas?</h2>
            <p className="question-subtitle">
              Tu percepción en la distribución de ingresos a nivel nacional
            </p>
          </div>
        </header>
        <div className="question-content">
          <div className="input-centered-perception">
            <div className="slider-labels">
              <div className="label-left">Más pobre</div>
              <div className="label-right">Más rico</div>
            </div>
            <div className="slider-wrap" style={wrapStyle}>
              <output className="slider-bubble" htmlFor="perceived-slider">
                {value}
              </output>
              <input
                id="perceived-slider"
                type="range"
                min={1}
                max={99}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="custom-slider"
              />
            </div>
            <p className="help-text">
              1 representa el 1% de hogares con menos ingresos y 99 el 1% con
              más ingresos.
            </p>
          </div>
        </div>
        <div className="button-wrapper">
          <button onClick={onPrev} className="btn-nav prev-btn">
            <i className="fas fa-arrow-left btn-icon-left" aria-hidden="true"></i>
            Anterior
          </button>
          <button
            onClick={onCalculate}
            className="btn-nav calculate-btn"
            disabled={isCalculating}
          >
            {isCalculating ? 'Calculando…' : 'Calcular'}
            {!isCalculating && (
              <i
                className="fas fa-arrow-right btn-icon-right"
                aria-hidden="true"
              ></i>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
