import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Bomb(): JSX.Element {
  throw new Error('kaboom')
}

describe('<ErrorBoundary />', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('todo bien')).toBeInTheDocument()
  })

  it('renders the default fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary label="Test">
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText(/no se pudo cargar este componente/i)).toBeInTheDocument()
  })

  it('renders a custom fallback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallback={<span>fallback propio</span>}>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('fallback propio')).toBeInTheDocument()
  })
})
