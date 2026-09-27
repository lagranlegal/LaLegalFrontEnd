import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MoneyInput } from '@/components/shared/MoneyInput'

/**
 * QA 03 H-08: un campo de dinero OPCIONAL que se toca y se borra mandaba
 * "0.00" en vez de vacío. En el avalúo del contrato eso es declarar que la
 * prenda vale cero (y el avalúo va a ser obligatorio cuando la categoría
 * tenga LTV: un "0.00" pasaría por dato puesto); en el conteo de apertura de
 * caja es contar $0 y quedar obligado a justificar un descuadre inventado.
 */

afterEach(cleanup)

function Campo({ optional, inicial }: { optional?: boolean; inicial: string }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <MoneyInput id="monto" value={valor} onChange={setValor} optional={optional} />
      <output data-testid="valor">{JSON.stringify(valor)}</output>
    </>
  )
}

const valor = () => screen.getByTestId('valor').textContent
const campo = () => document.getElementById('monto') as HTMLInputElement

describe('MoneyInput opcional', () => {
  it('borrado queda vacío, no "0.00"', () => {
    render(<Campo optional inicial="" />)
    fireEvent.change(campo(), { target: { value: '1.500.000' } })
    expect(valor()).toBe('"1500000.00"')

    fireEvent.change(campo(), { target: { value: '' } })

    expect(valor()).toBe('""')
    expect(campo().value).toBe('')
  })

  it('un cero escrito a propósito sigue siendo cero', () => {
    render(<Campo optional inicial="" />)
    fireEvent.change(campo(), { target: { value: '0' } })
    expect(valor()).toBe('"0.00"')
  })

  it('el obligatorio conserva su comportamiento: borrado es "0.00"', () => {
    render(<Campo inicial="5000.00" />)
    fireEvent.change(campo(), { target: { value: '' } })
    expect(valor()).toBe('"0.00"')
  })
})
