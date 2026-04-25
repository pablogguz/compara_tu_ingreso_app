import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import CookieBanner from '@/components/CookieBanner'

describe('<CookieBanner />', () => {
  beforeEach(() => {
    localStorage.removeItem('cookieConsent')
    // initGA appends a script tag — we don't care about its side effects in
    // these tests, but it does inspect window.gtag.
    delete (window as any).gtag
    delete (window as any).dataLayer
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows when there is no stored consent', () => {
    render(<CookieBanner />)
    expect(
      screen.getByRole('button', { name: /aceptar/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /rechazar/i })
    ).toBeInTheDocument()
  })

  it('does NOT show when consent is already accepted', () => {
    localStorage.setItem('cookieConsent', 'accepted')
    render(<CookieBanner />)
    expect(screen.queryByRole('button', { name: /aceptar/i })).toBeNull()
  })

  it('does NOT show when consent is already rejected', () => {
    localStorage.setItem('cookieConsent', 'rejected')
    render(<CookieBanner />)
    expect(screen.queryByRole('button', { name: /aceptar/i })).toBeNull()
  })

  it('Aceptar persists consent and dismisses the banner', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: /aceptar/i }))
    expect(localStorage.getItem('cookieConsent')).toBe('accepted')
    expect(screen.queryByRole('button', { name: /aceptar/i })).toBeNull()
  })

  it('Rechazar persists consent and dismisses the banner', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: /rechazar/i }))
    expect(localStorage.getItem('cookieConsent')).toBe('rejected')
    expect(screen.queryByRole('button', { name: /rechazar/i })).toBeNull()
  })
})
