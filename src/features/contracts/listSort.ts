import type { ContractSort } from '@/features/contracts/api'

/**
 * El orden de la lista de contratos (rediseño P2-d, issue #10): el valor de
 * `?orden=` en la URL ↔ el `sort` de `GET /contracts`. Sin `orden`, «Más
 * urgente» (`next_due_asc`, el default del backend: el que más meses debe
 * arriba, los cerrados al final). Lo ordena el backend; el front no reordena.
 */
export type ContractsOrden = 'numero_desc' | 'numero_asc' | 'cliente'

export const CONTRACT_SORT_OPTIONS: { value: ContractsOrden | undefined; sort: ContractSort; label: string }[] = [
  { value: undefined, sort: 'next_due_asc', label: 'Más urgente' },
  { value: 'numero_desc', sort: 'number_desc', label: 'Número ↓' },
  { value: 'numero_asc', sort: 'number_asc', label: 'Número ↑' },
  { value: 'cliente', sort: 'customer_asc', label: 'Cliente A–Z' },
]

export function sortFromOrden(orden: ContractsOrden | undefined): ContractSort {
  return CONTRACT_SORT_OPTIONS.find((o) => o.value === orden)?.sort ?? 'next_due_asc'
}
