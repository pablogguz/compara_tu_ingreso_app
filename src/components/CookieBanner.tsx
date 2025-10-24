'use client'

import { useState, useEffect } from 'react'
import { getCookieConsent, setCookieConsent, initGA } from '@/lib/analytics'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if consent has been given
    const consent = getCookieConsent()
    if (consent === null) {
      setShowBanner(true)
    } else if (consent === 'accepted') {
      // Initialize GA if already accepted
      initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
    }
  }, [])

  const handleAccept = () => {
    setCookieConsent('accepted')
    setShowBanner(false)
    initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
  }

  const handleReject = () => {
    setCookieConsent('rejected')
    setShowBanner(false)
  }

  // Don't render anything until mounted (prevents SSR mismatch)
  if (!mounted || !showBanner) return null

  return (
    <div 
      id="cookieConsent" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(88, 162, 236, 0.2)',
        padding: '0.75rem 1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 9999,
        display: 'block'
      }}
    >
      <div 
        className="cookie-content" 
        style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}
      >
        <div className="cookie-text" style={{ 
          margin: 0, 
          flex: 1, 
          minWidth: '300px',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: '#475569'
        }}>
          Utilizamos cookies para mejorar tu experiencia y guardar respuestas de forma anónima con fines académicos.
        </div>
        <div className="cookie-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleAccept}
            className="cookie-btn accept-cookies"
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#58a2ec',
              color: 'white',
              border: 'none',
              borderRadius: '100px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Aceptar
          </button>
          <button
            onClick={handleReject}
            className="cookie-btn reject-cookies"
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '100px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
