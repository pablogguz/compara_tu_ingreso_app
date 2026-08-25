import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StatsCards from '@/components/StatsCards'
import { MADRID_STATS } from './helpers/mockData'

vi.mock('@/lib/dataLoader', () => ({
  loadMunicipalityStats: vi.fn(),
}))

import { loadMunicipalityStats } from '@/lib/dataLoader'
const mockLoad = vi.mocked(loadMunicipalityStats)

beforeEach(() => {
  mockLoad.mockReset()
})
afterEach(cleanup)

describe('<StatsCards />', () => {
  it('renders a skeleton while loading', () => {
    mockLoad.mockReturnValue(new Promise(() => {}))
    render(<StatsCards municipality="28079" />)
    expect(screen.getByLabelText(/cargando estadísticas/i)).toBeInTheDocument()
  })

  it('renders the three formatted stats', async () => {
    mockLoad.mockResolvedValue(MADRID_STATS)
    render(<StatsCards municipality="28079" />)
    expect(await screen.findByText('21.500 €')).toBeInTheDocument()
    expect(screen.getByText('38.4%')).toBeInTheDocument()
    expect(screen.getByText('17.2%')).toBeInTheDocument()
    expect(mockLoad).toHaveBeenCalledWith('28079')
  })

  it('flags imputed values as provincial averages', async () => {
    mockLoad.mockResolvedValue(MADRID_STATS)
    render(<StatsCards municipality="28079" />)
    await screen.findByText('21.500 €')
    // foreign-born is imputed in the fixture; the other two are not
    expect(
      screen.getByText(/nacida en el extranjero \(2024, media provincial\)/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/ingreso medio equivalente \(2024\)/i)
    ).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    mockLoad.mockRejectedValue(new Error('boom'))
    render(<StatsCards municipality="28079" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/)
  })

  it('shows a notice when no stats exist for the municipality', async () => {
    mockLoad.mockResolvedValue(null as any)
    render(<StatsCards municipality="00000" />)
    expect(await screen.findByRole('status')).toHaveTextContent(/no se encontraron datos/i)
  })
})
