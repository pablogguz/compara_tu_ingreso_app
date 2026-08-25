'use client'

interface LandingPageProps {
  onStart: () => void
}

// Right-skewed income-distribution silhouette drawn behind the hero.
const CURVE =
  'M0,185 C70,185 100,30 160,30 C220,30 250,110 330,135 C430,165 620,176 800,178'

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="landing-page">
      <div className="distribution-curve" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="curveStroke" x1="0" x2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#58a2ec" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58a2ec" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#58a2ec" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="curve-area"
            d={`${CURVE} L800,200 L0,200 Z`}
            fill="url(#curveFill)"
          />
          <path
            className="curve-path"
            d={CURVE}
            fill="none"
            stroke="url(#curveStroke)"
          />
        </svg>
      </div>

      <span className="landing-eyebrow">
        <span className="landing-eyebrow__dot" aria-hidden="true" />
        Datos oficiales · INE · 2024
      </span>

      <h1 className="landing-title">
        Descubre tu posición en la{' '}
        <span className="landing-title__accent">distribución de ingresos</span>
      </h1>

      <p className="landing-subtitle">
        Compara los ingresos de tu hogar con los del resto de hogares en España
        a partir de datos administrativos de las declaraciones de IRPF.
      </p>

      <div className="landing-cta">
        <button
          type="button"
          className="btn btn--primary btn--xl"
          onClick={onStart}
        >
          <span>Comenzar</span>
          <span
            className="btn__icon btn__icon--chip btn__icon--right"
            aria-hidden="true"
          >
            <i className="fas fa-arrow-right"></i>
          </span>
        </button>
        <ul className="landing-facts" aria-label="Detalles">
          <li>Gratis</li>
          <li>Sin registro</li>
          <li>Menos de un minuto</li>
        </ul>
      </div>
    </main>
  )
}
