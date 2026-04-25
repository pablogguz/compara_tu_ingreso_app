interface ProgressHeaderProps {
  step: number
  total: number
}

const STEP_LABELS = ['Municipio', 'Ingresos', 'Hogar', 'Percepción']

export default function ProgressHeader({ step, total }: ProgressHeaderProps) {
  const pct = total > 1 ? ((step - 1) / (total - 1)) * 100 : 0
  const label = STEP_LABELS[step - 1] ?? ''
  const padded = (n: number) => String(n).padStart(2, '0')

  return (
    <header className="progress-header" aria-label="Progreso">
      <div className="progress-header__row">
        <div className="progress-header__brand">compara tu ingreso</div>
        <div
          className="progress-header__counter"
          role="status"
          aria-live="polite"
        >
          <span className="progress-header__step">{padded(step)}</span>
          <span className="progress-header__sep">/</span>
          <span className="progress-header__total">{padded(total)}</span>
          <span className="progress-header__divider" aria-hidden="true">
            ·
          </span>
          <span className="progress-header__label">{label}</span>
        </div>
      </div>
      <div className="progress-header__thread" aria-hidden="true">
        <div
          className="progress-header__thread-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  )
}
