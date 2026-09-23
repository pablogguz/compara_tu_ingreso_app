import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import IncomeStep from '@/components/questions/IncomeStep'

afterEach(cleanup)

function setup(overrides: Partial<React.ComponentProps<typeof IncomeStep>> = {}) {
  const props = {
    value: '' as number | '',
    paymentPeriods: 12 as 12 | 14,
    onValueChange: vi.fn(),
    onPaymentPeriodsChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    ...overrides,
  }
  render(<IncomeStep {...props} />)
  return props
}

const input = () => screen.getByRole('spinbutton', { name: /ingresos netos/i })
const next = () => screen.getByRole('button', { name: /siguiente/i })

describe('<IncomeStep />', () => {
  it('disables "Siguiente" until a valid amount is entered', () => {
    setup()
    expect(next()).toBeDisabled()
  })

  it('forwards typed values as numbers', () => {
    const { onValueChange } = setup()
    fireEvent.change(input(), { target: { value: '2500' } })
    expect(onValueChange).toHaveBeenLastCalledWith(2500)
  })

  it('forwards an empty string when the field is cleared', () => {
    const { onValueChange } = setup({ value: 2500 })
    fireEvent.change(input(), { target: { value: '' } })
    expect(onValueChange).toHaveBeenLastCalledWith('')
  })

  it('enables "Siguiente" for a valid amount', () => {
    const { onNext } = setup({ value: 2500 })
    expect(next()).toBeEnabled()
    fireEvent.click(next())
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows an error and blocks progress for out-of-range values', () => {
    setup({ value: 60000 })
    expect(screen.getByRole('alert')).toHaveTextContent(/entre 1 y 50\.000/i)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveClass('invalid')
    expect(next()).toBeDisabled()
  })

  it('shows the annual-vs-monthly hint for suspiciously high values but still allows progress', () => {
    setup({ value: 20000 })
    expect(screen.getByRole('status')).toHaveTextContent(/mensual, no anual/i)
    expect(next()).toBeEnabled()
  })

  it('toggles between 12 and 14 pagas', () => {
    const { onPaymentPeriodsChange } = setup({ paymentPeriods: 12 })
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    expect(onPaymentPeriodsChange).toHaveBeenCalledWith(14)
  })

  it('reflects the 14-pagas state visually', () => {
    setup({ paymentPeriods: 14 })
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toHaveClass('pagas-toggle--14')
    expect(screen.getByText('14 pagas')).toHaveClass('is-active')
  })

  it('"Anterior" calls onPrev', () => {
    const { onPrev } = setup()
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('shows the yearly total for the chosen number of payments', () => {
    setup({ value: 2000, paymentPeriods: 14 })
    expect(screen.getByText('28.000 €').closest('p')).toHaveTextContent(/al año.*14 pagas/i)
  })

  it('hides the yearly total while the amount is empty or invalid', () => {
    setup({ value: 60000 })
    expect(screen.queryByText(/^al año:/i)).toBeNull()
  })
})
