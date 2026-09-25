import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import HelpModal, { openHelp } from '@/components/HelpModal'

afterEach(cleanup)

const open = (tab?: Parameters<typeof openHelp>[0]) => act(() => openHelp(tab))

describe('<HelpModal />', () => {
  it('starts closed, with no button of its own', () => {
    render(<HelpModal />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('opens on the tab it is asked for', () => {
    render(<HelpModal />)
    open('hogar')
    expect(screen.getByRole('tab', { name: 'Hogar' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens the dialog with the first tab active and its content already rendered', () => {
    render(<HelpModal />)
    open()
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
    open()
    fireEvent.click(screen.getByRole('tab', { name: 'Sobre el autor' }))
    expect(screen.getByRole('tab', { name: 'Sobre el autor' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(/sobre el autor/i)
  })

  it('closes with the close button, the backdrop and Escape', () => {
    render(<HelpModal />)

    open()
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByRole('dialog')).toBeNull()

    open()
    fireEvent.click(document.querySelector('.modal-overlay')!)
    expect(screen.queryByRole('dialog')).toBeNull()

    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not close when clicking inside the dialog', () => {
    render(<HelpModal />)
    open()
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('locks body scroll while open and restores it on close', () => {
    render(<HelpModal />)
    open()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })
})
