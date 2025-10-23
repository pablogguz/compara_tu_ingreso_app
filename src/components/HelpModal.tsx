'use client'

import { useState, lazy, Suspense } from 'react'

// Lazy load tab content components
const DatosTab = lazy(() => import('@/components/HelpModal/DatosTab'))
const IngresosTab = lazy(() => import('@/components/HelpModal/IngresosTab'))
const HogarTab = lazy(() => import('@/components/HelpModal/HogarTab'))
const MetodologiaTab = lazy(() => import('@/components/HelpModal/MetodologiaTab'))
const GraficaTab = lazy(() => import('@/components/HelpModal/GraficaTab'))

export default function HelpModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('datos')

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="help-btn"
        aria-label="Ayuda"
      >
        <i className="fas fa-question-circle"></i>
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="help-btn"
        aria-label="Ayuda"
      >
        <i className="fas fa-question-circle"></i>
      </button>

      <div className="modal-overlay" onClick={() => setIsOpen(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Instrucciones y dudas frecuentes</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="modal-close"
              aria-label="Cerrar"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="modal-tabs">
            <button
              className={`tab-btn ${activeTab === 'datos' ? 'active' : ''}`}
              onClick={() => setActiveTab('datos')}
            >
              Datos
            </button>
            <button
              className={`tab-btn ${activeTab === 'ingresos' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingresos')}
            >
              ¿Qué ingresos debo incluir?
            </button>
            <button
              className={`tab-btn ${activeTab === 'hogar' ? 'active' : ''}`}
              onClick={() => setActiveTab('hogar')}
            >
              Hogar
            </button>
            <button
              className={`tab-btn ${activeTab === 'metodologia' ? 'active' : ''}`}
              onClick={() => setActiveTab('metodologia')}
            >
              Metodología
            </button>
            <button
              className={`tab-btn ${activeTab === 'grafica' ? 'active' : ''}`}
              onClick={() => setActiveTab('grafica')}
            >
              Gráfica
            </button>
          </div>

          <div className="modal-body">
            <Suspense fallback={<div className="loading-spinner">Cargando...</div>}>
              {activeTab === 'datos' && <DatosTab />}
              {activeTab === 'ingresos' && <IngresosTab />}
              {activeTab === 'hogar' && <HogarTab />}
              {activeTab === 'metodologia' && <MetodologiaTab />}
              {activeTab === 'grafica' && <GraficaTab />}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
