'use client'

import { useEffect, useState } from 'react'
import { getCookieConsent, setCookieConsent, initGA } from '@/lib/analytics'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const consent = getCookieConsent()
    if (consent === null) {
      setShowBanner(true)
    } else if (consent === 'accepted') {
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

  if (!mounted || !showBanner) return null

  return (
    <div id="cookieConsent" className="cookie-banner">
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          Utilizamos cookies para mejorar tu experiencia y guardamos las
          respuestas de forma anónima con fines de investigación académica.
        </p>
        <div className="cookie-banner__buttons">
          <button
            onClick={handleAccept}
            className="cookie-btn cookie-btn--accept"
          >
            Aceptar
          </button>
          <button
            onClick={handleReject}
            className="cookie-btn cookie-btn--reject"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
