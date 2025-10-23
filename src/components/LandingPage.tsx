'use client'

import { useEffect, useState } from 'react'

interface LandingPageProps {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animations on mount
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  return (
    <div className="landing-page">
      <div className={`distribution-curve ${isVisible ? 'visible' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200">
          <path
            d="M0,150 Q200,150 300,50 Q400,-50 500,50 Q600,150 800,150"
            fill="none"
            stroke="#58a2ec"
            className="curve-path"
          />
        </svg>
      </div>
      
      <h1 className={`landing-title ${isVisible ? 'visible' : ''}`}>
        Descubre tu posición en la distribución de ingresos
      </h1>
      
      <p className={`landing-subtitle ${isVisible ? 'visible' : ''}`}>
        Compara tus ingresos con los del resto de hogares en España utilizando
        datos administrativos de declaraciones de IRPF
      </p>
      
      <button
        className={`start-button ${isVisible ? 'visible' : ''}`}
        onClick={onStart}
      >
        Comenzar
      </button>
    </div>
  )
}
