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
    <section className="question-step" aria-labelledby="q-perceived">
      <div className="question-content-wrapper">
        <header className="question-header">
          <span className="question-icon" aria-hidden="true">
            <i className="fas fa-bullseye"></i>
          </span>
          <div className="question-header__text">
            <h2 className="question-title" id="q-perceived">
              ¿Dónde crees que te sitúas?
            </h2>
            <p className="question-subtitle">
              Tu percepción dentro de la distribución de ingresos de España
            </p>
          </div>
        </header>

        <div className="question-content">
          <div className="slider-field">
            <div className="slider-labels" aria-hidden="true">
              <span>Más pobre</span>
              <span>Más rico</span>
            </div>
            <div className="slider-wrap" style={wrapStyle}>
              <output
                className="slider-bubble"
                htmlFor="perceived-slider"
                aria-hidden="true"
              >
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
                aria-label="Percentil en el que crees que se sitúa tu hogar"
                aria-valuetext={`Percentil ${value}`}
              />
            </div>
          </div>
          <p className="help-text">
            1 representa al 1% de hogares con menos ingresos y 99 al 1% con
            más ingresos.
          </p>
        </div>

        <div className="button-wrapper">
          <button
            type="button"
            onClick={onPrev}
            className="btn btn--secondary"
            disabled={isCalculating}
          >
            <i
              className="fas fa-arrow-left btn__icon btn__icon--left"
              aria-hidden="true"
            ></i>
            Anterior
          </button>
          <button
            type="button"
            onClick={onCalculate}
            className="btn btn--primary"
            disabled={isCalculating}
            aria-busy={isCalculating || undefined}
          >
            {isCalculating ? (
              <>
                <span className="btn__spinner" aria-hidden="true" />
                Calculando…
              </>
            ) : (
              <>
                Calcular
                <i
                  className="fas fa-arrow-right btn__icon btn__icon--right"
                  aria-hidden="true"
                ></i>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
