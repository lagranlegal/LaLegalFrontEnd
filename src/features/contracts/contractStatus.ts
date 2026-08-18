import { todayBogota } from '@/lib/dates'
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
