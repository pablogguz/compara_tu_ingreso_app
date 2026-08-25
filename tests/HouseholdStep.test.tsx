import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import HouseholdStep from '@/components/questions/HouseholdStep'

afterEach(cleanup)

function setup(overrides: Partial<React.ComponentProps<typeof HouseholdStep>> = {}) {
  const props = {
    adults: 1,
    children: 0,
    onAdultsChange: vi.fn(),
    onChildrenChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    ...overrides,
  }
  render(<HouseholdStep {...props} />)
  return props
}

describe('<HouseholdStep />', () => {
  it('renders both selectors with their current values', () => {
    setup({ adults: 2, children: 3 })
    expect(screen.getByRole('combobox', { name: /mayores de 14/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /menores de 14/i })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('lets the user pick a different number of adults with the keyboard', () => {
    const { onAdultsChange } = setup({ adults: 1 })
    const adults = screen.getByRole('combobox', { name: /mayores de 14/i })
    fireEvent.focus(adults)
    fireEvent.keyDown(adults, { key: 'ArrowDown', code: 'ArrowDown' }) // open, focus "1"
    fireEvent.keyDown(adults, { key: 'ArrowDown', code: 'ArrowDown' }) // focus "2"
    fireEvent.keyDown(adults, { key: 'Enter', code: 'Enter' })
    expect(onAdultsChange).toHaveBeenCalledWith(2)
  })

  it('allows zero children (does not coerce 0 to the default)', () => {
    const { onChildrenChange } = setup({ children: 2 })
    const kids = screen.getByRole('combobox', { name: /menores de 14/i })
    fireEvent.focus(kids)
    fireEvent.keyDown(kids, { key: 'ArrowDown', code: 'ArrowDown' }) // open, focus "0"
    fireEvent.keyDown(kids, { key: 'Enter', code: 'Enter' })
    expect(onChildrenChange).toHaveBeenCalledWith(0)
  })

  it('navigates forward and back', () => {
    const { onNext, onPrev } = setup()
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).toHaveBeenCalledTimes(1)
  })
})
