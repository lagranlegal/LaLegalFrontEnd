import { useState } from 'react'
import { clampQuantity, unitLabel } from '@/lib/inventory/units'
import type { Item } from '@/lib/inventory/items'

/** Lo mínimo que hace falta saber del artículo para acotar una cantidad. */
type Medible = Pick<Item, 'unit' | 'quantity'>

/** El número tal como se teclea: separador local y SIN puntos de miles (que al releer el campo se leerían como decimales). */
function textoCantidad(quantity: number): string {
  return quantity.toLocaleString('es-CO', { maximumFractionDigits: 3, useGrouping: false })
}

/**
 * La cantidad de una línea de venta que se mide por peso o medida —
 * **controlada**.
 *
 * Era un `defaultValue`, o sea un input no controlado: se podía escribir 50 g
 * de un artículo del que solo hay 3 y la línea seguía mostrando "50" para
 * siempre, aunque el carrito ya había acotado a 3 y el total de al lado
 * cobrara 3. La pantalla decía una cosa y la venta hacía otra (QA F21-04).
 * Mostrar algo que no coincide con lo que va a pasar es peor que no mostrar
 * nada, y acá lo que no coincidía era el renglón de una factura.
 *
 * Los dos detalles que lo hacen usable además de honesto:
 *
 * 1. **Un número a medias no toca el carrito.** Mientras el texto no termine
 *    en dígito (`''`, `'0,'`) no se acota nada: acotar ahí convertiría "0,5"
 *    en 0,001 a mitad de tecleo, y borrar el campo lo rellenaría solo.
 * 2. **Si el carrito acota, el texto se corrige.** Tanto cuando el valor
 *    acotado cambia (50 → 3) como cuando la cantidad cambia desde afuera
 *    (volver a clicar el mismo artículo en el buscador suma 1).
 */
export function QuantityInput({
  item,
  quantity,
  onChange,
}: {
  item: Medible
  quantity: number
  onChange: (quantity: number) => void
}) {
  const [text, setText] = useState(() => textoCantidad(quantity))
  const [lastQuantity, setLastQuantity] = useState(quantity)

  // Sincronización en render, no en efecto (patrón "ajustar estado cuando
  // cambian las props" de React): solo corre cuando la cantidad del carrito
  // cambió de verdad, así que no pelea con lo que se está escribiendo.
  if (quantity !== lastQuantity) {
    setLastQuantity(quantity)
    if (Number(text.replace(',', '.')) !== quantity) setText(textoCantidad(quantity))
  }

  function handleChange(raw: string) {
    if (!/^\d*[.,]?\d*$/.test(raw)) return
    setText(raw)
    if (!/\d$/.test(raw)) return
    const pedida = Number(raw.replace(',', '.'))
    if (!Number.isFinite(pedida)) return
    const acotada = clampQuantity(item.unit, Number(item.quantity), pedida)
    onChange(acotada)
    setLastQuantity(acotada)
    if (acotada !== pedida) setText(textoCantidad(acotada))
  }

  return (
    <input
      inputMode="decimal"
      aria-label={`Cantidad en ${unitLabel(item.unit)}`}
      className="w-20 rounded-input border border-border bg-background px-2 py-1 text-right text-sm tnum outline-none focus:border-primary"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      // Al salir del campo, lo que se ve es lo que hay en el carrito: cubre
      // el campo vacío y el "0," que nunca llegó a ser un número.
      onBlur={() => setText(textoCantidad(quantity))}
    />
  )
}
