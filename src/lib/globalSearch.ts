import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { hasEnoughToSearch } from '@/lib/search'
import type { components } from '@/types/api'

/**
 * Las tres consultas de la búsqueda global de la topbar (rediseño P2-d). Viven
 * en `lib/` porque el shell no puede importar features (CLAUDE.md regla 3).
 * Cada una usa el `?q=` que ya existe en su listado y **solo corre con el
 * permiso de su módulo**: quien llama pasa `enabled` desde `usePermission`, y
 * así la búsqueda nunca deja un 403 en la consola.
 */
export type ContractHit = components['schemas']['ContractListItemOut']
export type CustomerHit = components['schemas']['CustomerOut']
export type ItemHit = components['schemas']['ItemOut']

/** Resultados por grupo: pocos, es un salto rápido, no un listado. */
export const GLOBAL_SEARCH_LIMIT = 5

/**
 * Contratos por número, código anterior o cliente (`GET /contracts?q=`). Desde
 * la primera tecla: los consecutivos son 1, 17, 213 (el piso de nombre y
 * documento lo pone el backend, por cláusula).
 */
export function useGlobalContractSearch(q: string, enabled: boolean) {
  const query = q.trim()
  return useQuery({
    queryKey: ['contracts', 'search', query, 'global'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts', { params: { query: { q: query, limit: GLOBAL_SEARCH_LIMIT } } })),
    select: (page) => page.items,
    enabled: enabled && query.length > 0,
  })
}

/** Clientes por nombre o documento (`GET /customers?q=`), desde `MIN_SEARCH_CHARS`. */
export function useGlobalCustomerSearch(q: string, enabled: boolean) {
  const query = q.trim()
  return useQuery({
    queryKey: ['customers', 'search', query, 'global'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/customers', { params: { query: { q: query, limit: GLOBAL_SEARCH_LIMIT } } })),
    select: (page) => page.items,
    enabled: enabled && hasEnoughToSearch(query),
  })
}

/** Artículos por código (prefijo) o nombre (`GET /inventory/items?q=`), desde la primera tecla, como el escáner. */
export function useGlobalItemSearch(q: string, enabled: boolean) {
  const query = q.trim()
  return useQuery({
    queryKey: ['inventory', 'items', 'search', query, 'global'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/items', { params: { query: { q: query, limit: GLOBAL_SEARCH_LIMIT } } })),
    select: (page) => page.items,
    enabled: enabled && query.length > 0,
  })
}
