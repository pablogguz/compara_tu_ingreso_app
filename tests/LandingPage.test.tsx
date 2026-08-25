import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LandingPage from '@/components/LandingPage'

afterEach(cleanup)

describe('<LandingPage />', () => {
  it('renders the headline with the accent phrase', () => {
    render(<LandingPage onStart={() => {}} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/descubre tu posición/i)
    expect(h1.querySelector('.landing-title__accent')).toHaveTextContent(
      /distribución de ingresos/i
    )
  })

  it('calls onStart when the CTA is clicked', () => {
    const onStart = vi.fn()
    render(<LandingPage onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /comenzar/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('uses the shared primary button system', () => {
    render(<LandingPage onStart={() => {}} />)
    const cta = screen.getByRole('button', { name: /comenzar/i })
    expect(cta).toHaveClass('btn', 'btn--primary')
    expect(cta).toHaveAttribute('type', 'button')
  })

  it('draws the decorative curve out of the accessibility tree', () => {
    const { container } = render(<LandingPage onStart={() => {}} />)
    const curve = container.querySelector('.distribution-curve')
    expect(curve).toHaveAttribute('aria-hidden', 'true')
    expect(curve?.querySelector('path.curve-path')).not.toBeNull()
  })
})
