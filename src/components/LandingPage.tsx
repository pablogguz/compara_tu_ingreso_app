'use client'

interface LandingPageProps {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="distribution-curve">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200">
          <defs>
            <linearGradient id="curveStroke" x1="0" x2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#58a2ec" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 Q200,150 300,50 Q400,-50 500,50 Q600,150 800,150"
            fill="none"
            stroke="url(#curveStroke)"
            className="curve-path"
          />
        </svg>
      </div>

      <h1 className="landing-title">
        Descubre tu posición en la
        <br />
        <span className="landing-title__accent">distribución de ingresos</span>
      </h1>

      <p className="landing-subtitle">
        Compara tus ingresos con los del resto de hogares en España utilizando
        datos administrativos de declaraciones de IRPF
      </p>

      <button type="button" className="start-button" onClick={onStart}>
        <span className="start-button__label">Comenzar</span>
        <span className="start-button__arrow" aria-hidden="true">
          <i className="fas fa-arrow-right"></i>
        </span>
      </button>
    </div>
  )
}
