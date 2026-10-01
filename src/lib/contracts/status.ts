import { todayBogota } from '@/lib/dates'

/** Lo mínimo de un contrato para saber su estado efectivo (sirve para `ContractOut` y `ContractListItemOut`). */
export interface ContractStatusFields {
  status: string
  extension_ends_at: string | null
}

/**
 * `"ready_for_auction"` NO es un valor real de `ContractOut.status` — el
 * backend solo persiste `active|in_arrears|in_extension|auctioned|paid`.
 * «Listo para remate» es un contrato en `in_extension` cuya prórroga
 * (`extension_ends_at`) ya venció. Vive en `lib/` porque lo usan el detalle
 * de contrato y la ficha del cliente (una feature no importa otra).
 */
export function isReadyForAuction(contract: ContractStatusFields): boolean {
  if (contract.status !== 'in_extension' || !contract.extension_ends_at) return false
  return contract.extension_ends_at < todayBogota()
}

/** Para `StatusBadge`: «Listo para remate» en vez de «Prórroga» una vez vencida. */
export function effectiveContractStatus(contract: ContractStatusFields): string {
  return isReadyForAuction(contract) ? 'ready_for_auction' : contract.status
}
