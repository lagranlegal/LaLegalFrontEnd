import type { FieldErrors } from 'react-hook-form'

/**
 * Lleva a la vista el problema que impide enviar un formulario.
 *
 * POR QUÉ EXISTE: en `ContractFormPage` el botón "Crear contrato" está al
 * final de un formulario largo y los mensajes de error se pintan junto a su
 * campo, arriba. Con todo lleno menos el cliente —el caso más común, porque
 * el buscador de cliente es lo primero y lo más fácil de saltarse— el único
 * mensaje quedaba a 800px por encima del botón: sin scroll, sin foco y sin
 * toast. Desde la silla del usuario, **el botón no hacía nada**. Reportado
 * en vivo por Mateo el 03/09/2026: "no mostraba ningún error o mensaje
 * informativo".
 *
 * React Hook Form ya enfoca el primer campo inválido, pero solo cuando puede:
 * `MoneyInput` no reenvía `ref`, así que un error en el monto no movía nada; y
 * el cliente ni siquiera vive en el schema (es estado aparte), así que RHF no
 * sabe que existe.
 *
 * Se elige el que esté MÁS ARRIBA en el documento, no el primero de la lista:
 * así da igual en qué orden vengan los errores de RHF y se pueden mezclar con
 * los de estado propio (el cliente) sin pensarlo dos veces.
 */
export function revealFirstError(names: string[]): boolean {
  const elementos = names
    .map((name) => document.getElementById(name) ?? document.querySelector<HTMLElement>(`[name="${name}"]`))
    .filter((el): el is HTMLElement => el !== null)
  if (elementos.length === 0) return false

  const primero = elementos.reduce((a, b) => (a.getBoundingClientRect().top <= b.getBoundingClientRect().top ? a : b))
  primero.scrollIntoView({ block: 'center', behavior: 'smooth' })
  // `preventScroll` porque el scroll ya lo hizo la línea de arriba, centrado;
  // dejar que `focus` lo repita a su manera lo deja pegado al borde.
  primero.focus({ preventScroll: true })
  return true
}

/**
 * Nombres de campo de todos los errores de RHF, incluidos los de arrays
 * (`items.0.category_id`) — que es como se llaman los inputs, así que sirven
 * tal cual para encontrarlos en el DOM.
 */
export function collectErrorNames(errors: FieldErrors, prefix = ''): string[] {
  const nombres: string[] = []
  recorrer(errors, prefix, nombres)
  return nombres
}

function recorrer(nodo: unknown, prefix: string, out: string[]): void {
  if (nodo === null || typeof nodo !== 'object') return
  const record = nodo as Record<string, unknown>
  // Una hoja de RHF es `{type, message, ref}`. Un grupo (objeto anidado o
  // array de prendas) no trae ninguno de los dos.
  if (typeof record.message === 'string' || typeof record.type === 'string') {
    if (prefix) out.push(prefix)
    return
  }
  for (const [clave, valor] of Object.entries(record)) {
    recorrer(valor, prefix ? `${prefix}.${clave}` : clave, out)
  }
}
