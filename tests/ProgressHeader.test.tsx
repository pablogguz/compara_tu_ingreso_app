import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ProgressHeader, { STEP_LABELS } from '@/components/questions/ProgressHeader'

afterEach(cleanup)

describe('<ProgressHeader />', () => {
  it('shows a zero-padded step counter and the step label', () => {
    render(<ProgressHeader step={2} total={4} />)
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('04')).toBeInTheDocument()
    expect(screen.getByText('Ingresos')).toBeInTheDocument()
  })

  it('exposes progress to assistive tech', () => {
    render(<ProgressHeader step={3} total={4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Paso 3 de 4: Hogar'
    )
  })

  it('fills the thread proportionally to step / total', () => {
    const { container, rerender } = render(<ProgressHeader step={1} total={4} />)
    const fill = () =>
      container.querySelector<HTMLElement>('.progress-header__thread-fill')!
    expect(fill().style.width).toBe('25%')
    rerender(<ProgressHeader step={4} total={4} />)
    expect(fill().style.width).toBe('100%')
  })

  it('has one label per step', () => {
    expect(STEP_LABELS).toHaveLength(4)
  })
})
