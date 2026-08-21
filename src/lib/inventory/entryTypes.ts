/**
 * Etiquetas y ayudas de los tipos de ingreso y egreso de mercancía.
 *
 * Viven en `lib/` y no en la feature porque las consumen cuatro pantallas
 * distintas (formulario de ingreso, detalle de ingreso, listado de ingresos,
 * formulario de egreso). Estaban duplicadas en las cuatro, y ese es
 * exactamente el camino por el que un tipo nuevo aparece bien nombrado en una
 * pantalla y como `initial_stock` en crudo en las otras tres.
 *
 * Espejan los enums `entry_origin` y `exit_type` del backend (00033).
 */

/** De dónde salió la mercancía. Cada uno se costea y se reporta distinto. */
export const ENTRY_ORIGIN_LABELS: Record<string, string> = {
  purchase: 'Compra a proveedor',
  initial_stock: 'Inventario inicial',
  adjustment_in: 'Sobrante de conteo',
  other: 'Otro',
  // No se ofrece en el formulario —lo emite el remate— pero sí aparece al
  // listar y hay que saber nombrarlo.
  auction: 'Remate de contrato',
}

/**
 * Los que un usuario puede elegir al registrar un ingreso, en el orden en que
 * tiene sentido leerlos: lo cotidiano primero, el cajón de sastre al final.
 * `auction` queda afuera a propósito: lo crea el remate de un contrato, no una
 * persona escribiendo un formulario.
 */
export const SELECTABLE_ENTRY_ORIGINS = ['purchase', 'initial_stock', 'adjustment_in', 'other'] as const

export type SelectableEntryOrigin = (typeof SELECTABLE_ENTRY_ORIGINS)[number]

/** La frase que explica cuándo usar cada uno — la duda real del usuario. */
export const ENTRY_ORIGIN_HINTS: Record<SelectableEntryOrigin, string> = {
  purchase: 'Le compraste mercancía a un proveedor. Es el único tipo que mueve plata.',
  initial_stock: 'Lo que ya tenías en la vitrina antes de empezar a usar el sistema. No toca la caja: esa plata salió antes y afuera.',
  adjustment_in: 'Contaste el inventario y sobró. Registra la diferencia para que el sistema deje de estar desactualizado.',
  other: 'Cualquier otro origen. Explica en las notas de dónde salió — si no, dentro de un mes nadie va a saberlo.',
}

/**
 * Etiqueta con respaldo seguro: un valor no mapeado se muestra tal cual en
 * vez de romper o quedar vacío — mismo criterio que `conceptLabel` y
 * `paymentMethodLabel`. Un enum nuevo del backend aparece en crudo hasta que
 * se agregue acá, que es feo pero legible; `undefined` no sería ninguna cosa.
 */
export function entryOriginLabel(origin: string): string {
  return ENTRY_ORIGIN_LABELS[origin] ?? origin
}

export function exitTypeLabel(exitType: string): string {
  return EXIT_TYPE_LABELS[exitType] ?? exitType
}

/** Solo la compra mueve plata; el resto de orígenes no tocan la caja. */
export function entryOriginTouchesCash(origin: string): boolean {
  return origin === 'purchase'
}

export const EXIT_TYPE_LABELS: Record<string, string> = {
  adjustment: 'Ajuste de inventario',
  damage: 'Daño',
  // 00033. No es lo mismo que un daño: un daño es mercancía que existe y ya
  // no sirve; una pérdida es mercancía que no está.
  loss: 'Pérdida o hurto',
  supplier_return: 'Devolución a proveedor',
  internal_use: 'Uso interno',
}

export const SELECTABLE_EXIT_TYPES = [
  'adjustment',
  'damage',
  'loss',
  'supplier_return',
  'internal_use',
] as const
