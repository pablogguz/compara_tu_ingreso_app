'use client'

import { useEffect, useState } from 'react'
import { getCookieConsent, setCookieConsent, initGA } from '@/lib/analytics'

interface CookieBannerProps {
  /** Always show, and let the buttons only dismiss it: no stored consent, no
   *  analytics (used by the /mocks screens). */
  preview?: boolean
}

export default function CookieBanner({ preview = false }: CookieBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (preview) {
      setShowBanner(true)
      return
    }
    const consent = getCookieConsent()
    if (consent === null) {
      setShowBanner(true)
    } else if (consent === 'accepted') {
      initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
    }
  }, [preview])

  const handleAccept = () => {
    if (preview) return setShowBanner(false)
    setCookieConsent('accepted')
    setShowBanner(false)
    initGA(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
  }

  const handleReject = () => {
    if (preview) return setShowBanner(false)
    setCookieConsent('rejected')
    setShowBanner(false)
  }

  if (!mounted || !showBanner) return null

  return (
    <div
      id="cookieConsent"
      className="cookie-banner"
      role="dialog"
      aria-label="Consentimiento de cookies"
    >
      <div className="cookie-banner__inner">
        <span className="cookie-banner__icon" aria-hidden="true">
          <i className="fas fa-cookie-bite"></i>
        </span>
        <p className="cookie-banner__text">
          Usamos cookies para mejorar tu experiencia y guardamos tus respuestas
          de forma anónima con fines de investigación académica.
        </p>
        <div className="cookie-banner__buttons">
          <button
            type="button"
            onClick={handleReject}
            className="btn btn--ghost btn--sm"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="btn btn--primary btn--sm"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
