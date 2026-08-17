/** Único mapa de módulo de negocio→etiqueta ES — gastos y el desglose de cierre de caja lo comparten (mismo enum del backend: `pawn|store|general`). */
export const MODULE_LABELS: Record<'pawn' | 'store' | 'general', string> = {
  pawn: 'Empeño',
  store: 'Tienda',
  general: 'General',
}

/**
 * `BreakdownLineOut.concept` del desglose de cierre de caja (paso 6) — el
 * backend manda el nombre interno del evento (`interest_payment`), no una
 * frase para mostrar. Mapa parcial: solo los valores vistos en pruebas
 * reales contra dev; uno no mapeado se muestra tal cual (fallback seguro,
 * mismo criterio que `StatusBadge`) hasta que aparezca y se agregue acá.
 */
export const CONCEPT_LABELS: Record<string, string> = {
  interest_payment: 'Abono de interés',
  capital_payment: 'Abono a capital',
  loan_disbursed: 'Desembolso de préstamo',
  expense: 'Gasto',
  sale: 'Venta',
  opening_balance: 'Saldo inicial',
}

export function conceptLabel(concept: string): string {
  return CONCEPT_LABELS[concept] ?? concept
}
