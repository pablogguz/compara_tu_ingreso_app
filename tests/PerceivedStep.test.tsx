import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import PerceivedStep from '@/components/questions/PerceivedStep'

afterEach(cleanup)

function setup(overrides: Partial<React.ComponentProps<typeof PerceivedStep>> = {}) {
  const props = {
    value: 50,
    isCalculating: false,
    onChange: vi.fn(),
    onCalculate: vi.fn(),
    onPrev: vi.fn(),
    ...overrides,
  }
  const utils = render(<PerceivedStep {...props} />)
  return { ...props, ...utils }
}

describe('<PerceivedStep />', () => {
  it('renders the slider with the current value and bubble', () => {
    setup({ value: 72 })
    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('72')
    expect(slider).toHaveAttribute('aria-valuetext', 'Percentil 72')
    expect(screen.getByText('72')).toHaveClass('slider-bubble')
  })

  it('positions the bubble along the track via the --value custom property', () => {
    const { container } = setup({ value: 1 })
    const wrap = container.querySelector<HTMLElement>('.slider-wrap')!
    expect(wrap.style.getPropertyValue('--value')).toBe('0%')
  })

  it('reports slider changes as numbers', () => {
    const { onChange } = setup()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith(80)
  })

  it('"Calcular" triggers onCalculate', () => {
    const { onCalculate } = setup()
    fireEvent.click(screen.getByRole('button', { name: /calcular/i }))
    expect(onCalculate).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons and shows a spinner while calculating', () => {
    setup({ isCalculating: true })
    const calc = screen.getByRole('button', { name: /calculando/i })
    expect(calc).toBeDisabled()
    expect(calc).toHaveAttribute('aria-busy', 'true')
    expect(calc.querySelector('.btn__spinner')).not.toBeNull()
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })
})
