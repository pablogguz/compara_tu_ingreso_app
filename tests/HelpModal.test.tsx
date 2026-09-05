import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import HelpModal from '@/components/HelpModal'

afterEach(cleanup)

const fab = () => screen.getByRole('button', { name: /ayuda/i })

describe('<HelpModal />', () => {
  it('starts closed with only the floating button', () => {
    render(<HelpModal />)
    expect(fab()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the dialog with the first tab active and its content already rendered', () => {
    render(<HelpModal />)
    fireEvent.click(fab())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName(/instrucciones y dudas frecuentes/i)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(screen.getByRole('tab', { name: 'Datos' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    // no lazy boundary: the content is in the DOM on the same tick
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      /de dónde vienen los datos/i
    )
  })

  it('switches tabs synchronously', () => {
    render(<HelpModal />)
    fireEvent.click(fab())
    fireEvent.click(screen.getByRole('tab', { name: 'Sobre el autor' }))
    expect(screen.getByRole('tab', { name: 'Sobre el autor' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(/sobre el autor/i)
  })

  it('closes with the close button, the backdrop and Escape', () => {
    render(<HelpModal />)

    fireEvent.click(fab())
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(fab())
    fireEvent.click(document.querySelector('.modal-overlay')!)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(fab())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not close when clicking inside the dialog', () => {
    render(<HelpModal />)
    fireEvent.click(fab())
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('locks body scroll while open and restores it on close', () => {
    render(<HelpModal />)
    fireEvent.click(fab())
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })
})
