import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type AuditLogEntry = components['schemas']['AuditLogOut']

export interface AuditLogFilters {
  module?: string
  entity_type?: string
  user_id?: string
}

/**
 * Filtros combinables (CLAUDE.md paso 9) — `module`/`entity_type`/`user_id`
 * son los únicos que acepta `GET /audit-log` (sin rango de fechas, a
 * diferencia de `/reports/closings`: confirmado en `src/types/api.ts`, no
 * se inventa un filtro que el backend no tiene).
 */
export function useAuditLog(filters: AuditLogFilters) {
  return useCursorInfiniteQuery(['audit', 'log', filters] as const, (cursor) =>
    unwrap(api.GET('/api/v1/audit-log', { params: { query: { ...filters, cursor } } })),
  )
}
