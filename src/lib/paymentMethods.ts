/** Único mapa de medios de pago→etiqueta ES — lo usan contratos, y luego caja/ventas (mismo enum del backend). */
export const PAYMENT_METHOD_LABELS: Record<'cash' | 'transfer' | 'other', string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
}
