import type { ContractChainLink } from '@/features/contracts/api'

/**
 * Los vecinos de un contrato dentro de su cadena de ampliaciones
 * (`GET /contracts/{id}/chain`, de la raíz al último).
 *
 * - `successor`: a cuál pasó la deuda — el que tiene a este como
 *   `parent_contract_id`. **No** es "el siguiente de la lista": si la cadena
 *   llegara a bifurcarse (hoy en cero, lo vigila `verificar_cadenas.py`), el
 *   siguiente por fecha podría ser hijo de otro. Ante dos hijos gana el
 *   último, igual que `find_successor_contract` en el backend.
 * - `current`: dónde vive la deuda HOY, el último de la cadena. Con A → B → C,
 *   desde A el sucesor es B pero la deuda está en C — y decir solo «pasó a B»
 *   manda al usuario a otro contrato cerrado.
 */
export interface ChainNeighbors {
  root: ContractChainLink | null
  parent: ContractChainLink | null
  successor: ContractChainLink | null
  current: ContractChainLink | null
}

export function chainNeighbors(chain: readonly ContractChainLink[] | undefined, contractId: string): ChainNeighbors {
  if (!chain || chain.length === 0) return { root: null, parent: null, successor: null, current: null }
  const self = chain.find((c) => c.id === contractId)
  const hijos = chain.filter((c) => c.parent_contract_id === contractId)
  return {
    root: chain[0] ?? null,
    parent: self?.parent_contract_id ? (chain.find((c) => c.id === self.parent_contract_id) ?? null) : null,
    successor: hijos.at(-1) ?? null,
    current: chain.at(-1) ?? null,
  }
}
