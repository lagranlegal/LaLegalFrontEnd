import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QuantityInput } from '@/features/sales/components/QuantityInput'
import { clampQuantity } from '@/lib/inventory/units'

/**
 * QA F21-04: la línea de venta no puede decir una cantidad y cobrar otra.
 *
 * El input era `defaultValue`, o sea NO controlado: se escribía 50 g de un
 * artículo del que hay 3, el carrito acotaba a 3, el total cobraba 3 y el
 * renglón seguía mostrando "50" para siempre. Con el código viejo el primer
 * test de acá falla ("50" en pantalla cuando el carrito ya tiene 3).
 */

// Vitest corre sin `globals`, así que el auto-cleanup de Testing Library no
// se engancha solo y los renders se apilarían en el mismo DOM.
afterEach(cleanup)

const ORO = { unit: 'gram', quantity: '3.000' } as const
const CADENA = { unit: 'unit', quantity: '5.000' } as const

/** Monta el input con el carrito de verdad detrás: el que acota es el padre. */
function Carrito({ item = ORO, inicial = 1 }: { item?: { unit: string; quantity: string }; inicial?: number }) {
  const [quantity, setQuantity] = useState(inicial)
  return (
    <>
      <QuantityInput item={item} quantity={quantity} onChange={setQuantity} />
      <output data-testid="carrito">{quantity}</output>
    </>
  )
}

function campo(): HTMLInputElement {
  return screen.getByLabelText(/Cantidad en/i) as HTMLInputElement
}

describe('QuantityInput — la línea muestra lo que se va a cobrar', () => {
  it('escribir más de lo disponible se ve acotado en el propio renglón', () => {
    render(<Carrito />)

    fireEvent.change(campo(), { target: { value: '50' } })

    expect(screen.getByTestId('carrito').textContent).toBe('3')
    expect(campo().value).toBe('3')
  })

  it('seguir tecleando sobre un valor ya acotado tampoco despega la línea del carrito', () => {
    // El caso que un `value` ingenuo no cubre: 50 → acotado a 3; el siguiente
    // dígito da 503, que vuelve a acotar a 3, así que la cantidad del carrito
    // NO cambia y una sincronización por props no se enteraría.
    render(<Carrito />)

    fireEvent.change(campo(), { target: { value: '50' } })
    fireEvent.change(campo(), { target: { value: '503' } })

    expect(screen.getByTestId('carrito').textContent).toBe('3')
    expect(campo().value).toBe('3')
  })

  it('acepta decimales con coma y no los estropea a mitad de tecleo', () => {
    render(<Carrito />)

    fireEvent.change(campo(), { target: { value: '0' } })
    fireEvent.change(campo(), { target: { value: '0,' } })
    // "0," todavía no es un número: el carrito no se toca (acotarlo lo
    // dejaría en 0,001 y el siguiente dígito ya no podría escribirse).
    expect(campo().value).toBe('0,')

    fireEvent.change(campo(), { target: { value: '0,5' } })
    expect(campo().value).toBe('0,5')
    expect(screen.getByTestId('carrito').textContent).toBe('0.5')
  })

  it('borrar el campo no lo rellena solo, y al salir vuelve a lo que hay en el carrito', () => {
    render(<Carrito inicial={2} />)

    fireEvent.change(campo(), { target: { value: '' } })
    expect(campo().value).toBe('')
    expect(screen.getByTestId('carrito').textContent).toBe('2')

    fireEvent.blur(campo())
    expect(campo().value).toBe('2')
  })

  it('si la cantidad cambia desde afuera (volver a agregar el artículo), el campo la refleja', () => {
    function ConBoton() {
      const [quantity, setQuantity] = useState(1)
      return (
        <>
          <QuantityInput item={ORO} quantity={quantity} onChange={setQuantity} />
          <button onClick={() => setQuantity((q) => clampQuantity(ORO.unit, Number(ORO.quantity), q + 1))}>Agregar</button>
        </>
      )
    }
    render(<ConBoton />)

    fireEvent.click(screen.getByText('Agregar'))

    expect(campo().value).toBe('2')
  })

  it('no deja escribir letras ni un segundo separador', () => {
    render(<Carrito />)

    fireEvent.change(campo(), { target: { value: '1a' } })
    expect(campo().value).toBe('1')

    fireEvent.change(campo(), { target: { value: '1,2' } })
    fireEvent.change(campo(), { target: { value: '1,2,' } })
    expect(campo().value).toBe('1,2')
  })
})

describe('clampQuantity', () => {
  it('el piso de un producto fraccionable es 0,001 y no 1 (medio gramo de oro se vende)', () => {
    expect(clampQuantity(ORO.unit, Number(ORO.quantity), 0.5)).toBe(0.5)
    expect(clampQuantity(ORO.unit, Number(ORO.quantity), 0)).toBe(0.001)
  })

  it('un producto discreto no baja de 1 ni pasa del stock', () => {
    expect(clampQuantity(CADENA.unit, Number(CADENA.quantity), 0.5)).toBe(1)
    expect(clampQuantity(CADENA.unit, Number(CADENA.quantity), 9)).toBe(5)
  })
})
