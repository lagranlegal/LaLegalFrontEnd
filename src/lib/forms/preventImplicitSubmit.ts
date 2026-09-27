import type { KeyboardEvent } from 'react'

/**
 * Apaga el "envío implícito" de HTML: Enter en un `<input>` de un `<form>`
 * dispara el submit como si se hubiera pulsado el botón.
 *
 * POR QUÉ EXISTE: en un formulario de dinero eso es registrar la operación
 * sin haberlo decidido. Confirmado en vivo (QA F6-03, 27/09/2026): en el punto
 * de venta, escribir un código en el buscador y pulsar Enter cobró el carrito
 * que ya estaba armado —venta #20 registrada, caja movida— y el artículo
 * buscado ni se agregó. Un lector de código de barras manda Enter después de
 * cada lectura, así que cada escaneo habría cobrado el carrito anterior. Lo
 * mismo pasa con Enter en el motivo del descuento, en un monto o en el
 * buscador de cliente de un contrato (que desembolsa).
 *
 * Regla: una operación de dinero se registra SOLO con su botón explícito. Se
 * cuelga del `<form>` (`onKeyDown={preventImplicitSubmit}`) y no de cada campo
 * porque el eslabón débil siempre es el campo que se agregue mañana sin
 * acordarse de esto.
 *
 * Qué NO toca:
 * - `<textarea>`: ahí Enter es un salto de línea y nunca envía.
 * - Botones: Enter sobre el botón "Vender" enfocado ES el gesto explícito, y
 *   sobre cualquier otro botón es su clic normal.
 * - Un campo que ya decidió qué hace Enter (el buscador agrega el artículo
 *   encontrado) lo resuelve él mismo antes de que el evento llegue acá.
 */
export function preventImplicitSubmit(e: KeyboardEvent<HTMLFormElement>): void {
  if (e.key !== 'Enter') return
  if (e.target instanceof HTMLInputElement) e.preventDefault()
}
