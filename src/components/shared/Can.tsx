import type { ReactNode } from 'react'
import { usePermission } from '@/lib/permissions/usePermission'

/**
 * `<Can permission="contracts.auction">…</Can>` — envuelve toda acción
 * sensible (docs/DESIGN_SYSTEM.md §3). Deny-by-default: si el permiso no
 * está en `/me.permissions`, no renderiza `children` (ni `fallback` a menos
 * que se pase explícitamente).
 */
export function Can({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const allowed = usePermission(permission)
  return allowed ? <>{children}</> : <>{fallback}</>
}
