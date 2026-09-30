import { formatDate, todayBogota } from '@/lib/dates'
import { formatCOP } from '@/lib/money'
import type { Contract } from '@/features/contracts/api'

/**
 * `"ready_for_auction"` NO es un valor real de `ContractOut.status` — el
 * backend solo persiste `active|in_arrears|in_extension|auctioned|paid`
 * (confirmado contra `docs/pending/API_GUIDE.md` §7). "Listo para remate" es
 * un CONTRATO EN `in_extension` cuya prórroga (`extension_ends_at`) ya
 * venció — se consulta con el endpoint dedicado `GET
 * /contracts/ready-for-auction`, nunca con `GET /contracts?status=...`.
 *
 * **Bug real corregido acá:** tanto `ContractDetailPage` (condición del
 * botón "Rematar") como `ContractsListPage` (tab "Listos para remate", que
 * mandaba `status=ready_for_auction` a `GET /contracts` — un valor que ese
 * filtro nunca va a encontrar) asumían `status === 'ready_for_auction'`
 * como si fuera un estado real. Como TypeScript tipa `status` como `string`
 * pelado (sin enum), nunca lo iba a atrapar — solo se encontró probando
 * contra un contrato real en `in_extension` vencido.
 */
export function isReadyForAuction(contract: Pick<Contract, 'status' | 'extension_ends_at'>): boolean {
  if (contract.status !== 'in_extension' || !contract.extension_ends_at) return false
  return contract.extension_ends_at < todayBogota()
}

/** Para `StatusBadge`: muestra "Listo para remate" en vez de "Prórroga" una vez vencida — mismo criterio visual que ya esperaba `STATUS_LABELS`. */
export function effectiveContractStatus(contract: Pick<Contract, 'status' | 'extension_ends_at'>): string {
  return isReadyForAuction(contract) ? 'ready_for_auction' : contract.status
}

/**
 * El encabezado de estado del detalle (F9-16): «En mora» era una pastilla de
 * 12 px junto a un «Vencimiento» en el futuro, y quien miraba rápido leía "al
 * día". Para los estados que piden acción dice desde cuándo, cuánto se debe y
 * cuánto salda hoy (esas cifras salen de `payment-options`, nunca se calculan
 * aquí). `null` para los demás: un contrato al día no necesita titular.
 */
export function contractStatusHeadline(
  contract: Pick<Contract, 'status' | 'extension_ends_at' | 'interest_paid_until'>,
  quote?: { months_owed: number; payoff_total: string } | null,
): { title: string; detail: string | null } | null {
  const deuda = quote
    ? `Debe ${quote.months_owed} ${quote.months_owed === 1 ? 'mes' : 'meses'} de interés · para saldar hoy ${formatCOP(quote.payoff_total)}`
    : null
  if (isReadyForAuction(contract)) {
    return { title: `Listo para remate: la prórroga terminó el ${formatDate(contract.extension_ends_at ?? '')}`, detail: deuda }
  }
  if (contract.status === 'in_extension') {
    const title = contract.extension_ends_at
      ? `En prórroga hasta el ${formatDate(contract.extension_ends_at)}: después queda listo para remate`
      : 'En prórroga'
    return { title, detail: deuda }
  }
  if (contract.status === 'in_arrears') {
    return { title: `En mora desde el ${formatDate(contract.interest_paid_until)}`, detail: deuda }
  }
  return null
}
