import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))
vi.mock('@/lib/analytics', () => ({
  initGA: vi.fn(),
  shouldLoadGA: () => false,
  getCookieConsent: () => 'rejected',
  setCookieConsent: vi.fn(),
}))
vi.mock('@/lib/dataLoader', () => ({
  loadMunicipalityLookup: vi.fn().mockResolvedValue([]),
}))

import Home from '@/app/page'

afterEach(cleanup)

// The flow itself is covered by Ensayo.test.tsx; the home page is the essay.
describe('home page', () => {
  it('renders the essay with its help link', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1, name: 'Descubre tu posición en la distribución de la renta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ayuda y metodología' })).toBeInTheDocument()
  })
})
