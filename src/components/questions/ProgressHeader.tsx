interface ProgressHeaderProps {
  step: number
  total: number
}

export const STEP_LABELS = ['Municipio', 'Ingresos', 'Hogar', 'Percepción']

export default function ProgressHeader({ step, total }: ProgressHeaderProps) {
  const pct = total > 0 ? (step / total) * 100 : 0
  const label = STEP_LABELS[step - 1] ?? ''
  const padded = (n: number) => String(n).padStart(2, '0')

  return (
    <header className="progress-header" aria-label="Progreso">
      <div className="progress-header__row">
        <span className="progress-header__brand">compara tu ingreso</span>
        <span className="progress-header__divider" aria-hidden="true">
          ·
        </span>
        <span
          className="progress-header__counter"
          role="status"
          aria-live="polite"
          aria-label={`Paso ${step} de ${total}: ${label}`}
        >
          <span className="progress-header__step">{padded(step)}</span>
          <span className="progress-header__sep">/</span>
          <span className="progress-header__total">{padded(total)}</span>
        </span>
        <span className="progress-header__divider" aria-hidden="true">
          ·
        </span>
        <span className="progress-header__label">{label}</span>
      </div>
      <div
        className="progress-header__thread"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label="Progreso del cuestionario"
      >
        <div
          className="progress-header__thread-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  )
}
