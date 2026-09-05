'use client'

import { useCallback, useEffect, useState } from 'react'
// The tabs are static text (~15 KB of JSX, no dependencies). They used to be
// lazy-loaded, which meant a chunk round-trip and a "Cargando…" flash on the
// first click of every tab; bundling them costs nothing and makes the modal
// respond instantly.
import DatosTab from '@/components/HelpModal/DatosTab'
import IngresosTab from '@/components/HelpModal/IngresosTab'
import HogarTab from '@/components/HelpModal/HogarTab'
import MetodologiaTab from '@/components/HelpModal/MetodologiaTab'
import GraficaTab from '@/components/HelpModal/GraficaTab'
import AutorTab from '@/components/HelpModal/AutorTab'

type TabId = 'datos' | 'ingresos' | 'hogar' | 'metodologia' | 'grafica' | 'autor'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'datos', label: 'Datos' },
  { id: 'ingresos', label: '¿Qué ingresos incluyo?' },
  { id: 'hogar', label: 'Hogar' },
  { id: 'metodologia', label: 'Metodología' },
  { id: 'grafica', label: 'Gráfica' },
  { id: 'autor', label: 'Sobre el autor' },
]

const TAB_CONTENT: Record<TabId, () => JSX.Element> = {
  datos: DatosTab,
  ingresos: IngresosTab,
  hogar: HogarTab,
  metodologia: MetodologiaTab,
  grafica: GraficaTab,
  autor: AutorTab,
}

export default function HelpModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('datos')

  const close = useCallback(() => setIsOpen(false), [])

  // Escape closes; body scroll is locked while open.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, close])

  const ActiveContent = TAB_CONTENT[activeTab]

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="help-btn"
        aria-label="Ayuda"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <i className="fas fa-question-circle" aria-hidden="true"></i>
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={close}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="help-modal-title">Instrucciones y dudas frecuentes</h2>
              <button
                type="button"
                onClick={close}
                className="modal-close"
                aria-label="Cerrar"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>

            <div className="modal-tabs" role="tablist" aria-label="Secciones de ayuda">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`help-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls="help-tabpanel"
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              className="modal-body"
              role="tabpanel"
              id="help-tabpanel"
              aria-labelledby={`help-tab-${activeTab}`}
            >
              <ActiveContent />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
