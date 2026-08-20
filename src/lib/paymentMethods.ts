/** Único mapa de medios de pago→etiqueta ES — lo usan contratos, y luego caja/ventas (mismo enum del backend). */
export const PAYMENT_METHOD_LABELS: Record<'cash' | 'transfer' | 'other', string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
}

/**
 * Para valores que llegan tipados como `string` desde la API (ej.
 * `EntryOut.payment_method`, que el backend declara `str | None` y no como el
 * literal del enum). Mismo criterio de fallback seguro que `conceptLabel` en
 * `lib/modules.ts`: un valor no mapeado se muestra tal cual en vez de romper.
 */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method
}
