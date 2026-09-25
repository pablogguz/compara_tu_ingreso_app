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

export type HelpTabId = 'datos' | 'ingresos' | 'hogar' | 'metodologia' | 'grafica' | 'autor'
type TabId = HelpTabId

export const HELP_TABS: Array<{ id: TabId; label: string }> = [
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

interface HelpModalProps {
  /** Start with the dialog open (used by the tests). */
  defaultOpen?: boolean
  defaultTab?: TabId
}

const OPEN_EVENT = 'cti:open-help'

/** Opens the help dialog, optionally on a given tab. The page links to it from
 *  its header and its closing line; there is no floating button. */
export function openHelp(tab?: HelpTabId) {
  window.dispatchEvent(new CustomEvent<HelpTabId | undefined>(OPEN_EVENT, { detail: tab }))
}

export default function HelpModal({ defaultOpen = false, defaultTab = 'datos' }: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const tab = (e as CustomEvent<HelpTabId | undefined>).detail
      if (tab) setActiveTab(tab)
      setIsOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  // on narrow screens the tab strip scrolls: keep the active tab in view
  useEffect(() => {
    if (!isOpen) return
    document.getElementById(`help-tab-${activeTab}`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [isOpen, activeTab])

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
              {HELP_TABS.map((tab) => (
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
              {/* keyed so each tab switch fades its panel in */}
              <div key={activeTab} className="help-panel">
                <ActiveContent />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
