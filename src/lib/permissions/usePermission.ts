import { useMe } from '@/lib/auth/me'

/**
 * RBAC dinámico por empresa (docs/ARCHITECTURE.md §5): los permisos NO se
 * hardcodean por rol, se evalúan por código exacto contra `/me.permissions`
 * — el mismo set que `require_permission` acepta en el backend. La UI
 * oculta; el backend es la única autoridad (nunca asumir que ocultar un
 * botón protege algo).
 */
export function usePermission(code: string): boolean {
  const { data } = useMe()
  return data?.permissions.includes(code) ?? false
}
