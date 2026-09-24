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
  purchase: 'Compra a proveedor',
  opening_balance: 'Saldo inicial',
  // 00032. Se nombran desde el punto de vista del cajón, que es quien lee el
  // acta: "consignado" dice qué pasó con esos billetes mucho mejor que
  // "traslado saliente". Van etiquetados aparte de los gastos a propósito —
  // consignar no es gastar, y el acta es justo donde esa confusión costaría
  // caro (ver aggregate.ts, TRANSFER_CONCEPTS).
  transfer_out: 'Consignado / trasladado',
  transfer_in: 'Recibido de otra cuenta',
  adjustment: 'Ajuste',
  // 00038. Antes las liquidaciones salían como "Ajuste" en el acta, que a
  // quien firma el arqueo no le dice nada.
  settlement_out: 'Liquidado del convenio',
  settlement_in: 'Recibido del convenio',
  // 00042. Faltaba: la devolución de un cliente salía como `sale_return` en el
  // acta de cierre, en inglés y entre conceptos traducidos — en un documento
  // que se imprime, se firma y se archiva (auditoría de QA, F9-03).
  sale_return: 'Devolución a cliente',
  // 00054. Mismo caso que `sale_return`, encontrado verificando F21-08: el
  // aporte y el retiro del dueño mueven el cajón con conceptos PROPIOS (no
  // `adjustment` ni `expense`, a propósito — ver `capital/service.py`), y sin
  // estas dos líneas salían `owner_contribution`/`owner_withdrawal` en el
  // acta de cierre. Se nombran desde el punto de vista del cajón, igual que
  // los traslados.
  owner_contribution: 'Aporte del dueño',
  owner_withdrawal: 'Retiro del dueño',
  other: 'Otro',
}

/**
 * Los 15 valores del enum `cash_concept` están cubiertos arriba (`opening_balance`
 * no es del enum: es la línea sintética del saldo inicial del desglose). Si el
 * backend agrega uno nuevo, `CONCEPT_LABELS` lo muestra tal cual —fallback
 * seguro— pero queda en inglés en el acta: al crear un concepto, agregarle aquí
 * su frase. `tests/label-catalogs.test.ts` hace fallar el build si se olvida.
 */

export function conceptLabel(concept: string): string {
  return CONCEPT_LABELS[concept] ?? concept
}
