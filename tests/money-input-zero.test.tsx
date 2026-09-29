import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MoneyInput } from '@/components/shared/MoneyInput'

/**
 * F9-24: los campos de dinero obligatorios nacían con «0». Con el cursor
 * antes del cero (tecla Inicio, un toque a la izquierda en el celular),
 * escribir 500000 daba 5.000.000. Ahora un obligatorio en cero se muestra
 * VACÍO con «0» de placeholder, y al enfocar se selecciona todo.
 */
afterEach(cleanup)

describe('MoneyInput — el cero inicial no se cuela en la cifra', () => {
  it('obligatorio en cero: vacío con placeholder «0»', () => {
    render(<MoneyInput value="0.00" onChange={vi.fn()} ariaLabel="Monto" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    expect(input.value).toBe('')
    expect(input.placeholder).toBe('0')
  })

  it('escribir 500000 en un obligatorio que nació en cero da 500.000', () => {
    const onChange = vi.fn()
    render(<MoneyInput value="0.00" onChange={onChange} ariaLabel="Monto" />)
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '500000' } })
    expect(onChange).toHaveBeenLastCalledWith('500000.00')
  })

  it('opcional con un cero escrito a propósito lo sigue mostrando (cero ≠ sin dato)', () => {
    render(<MoneyInput value="0.00" onChange={vi.fn()} optional ariaLabel="Monto" />)
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('0')
  })

  it('al enfocar se selecciona todo', () => {
    render(<MoneyInput value="1500.00" onChange={vi.fn()} ariaLabel="Monto" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    fireEvent.focus(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
  })
})
