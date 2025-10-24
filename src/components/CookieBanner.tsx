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
        backgroundColor: '#f8f9fa', 
        borderBottom: '2px solid #58a2ec',
        padding: '1.5rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
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
        <div className="cookie-text" style={{ margin: 0, flex: 1, minWidth: '300px' }}>
          Utilizamos cookies para entender cómo utilizan los usuarios nuestra web y
          mejorar tu experiencia, y guardamos las respuestas de forma anónima con fines
          de investigación académica.{' '}
        </div>
        <div className="cookie-buttons" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleAccept}
            className="cookie-btn accept-cookies"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#58a2ec',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Aceptar
          </button>
          <button
            onClick={handleReject}
            className="cookie-btn reject-cookies"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
